import { nativeFetch } from './nativeFetch';

function getFirebaseWebConfig(): { projectId: string; apiKey: string } {
  const env = (import.meta as { env?: Record<string, string> }).env ?? {};
  const projectId = env.VITE_FIREBASE_PROJECT_ID ?? '';
  const apiKey = env.VITE_FIREBASE_API_KEY ?? '';
  if (!projectId || !apiKey) {
    throw new Error('Configuração Firebase ausente no app.');
  }
  return { projectId, apiKey };
}

function decodeValue(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const v = value as Record<string, unknown>;

  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue === true;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('timestampValue' in v) return new Date(String(v.timestampValue));
  if ('nullValue' in v) return null;
  if ('geoPointValue' in v) {
    const geo = v.geoPointValue as { latitude?: number; longitude?: number };
    return { lat: Number(geo.latitude), lng: Number(geo.longitude) };
  }
  if ('arrayValue' in v) {
    const arr = v.arrayValue as { values?: unknown[] };
    return (arr.values ?? []).map(decodeValue);
  }
  if ('mapValue' in v) {
    const map = v.mapValue as { fields?: Record<string, unknown> };
    return decodeFields(map.fields ?? {});
  }
  if ('referenceValue' in v) return v.referenceValue;
  return value;
}

function decodeFields(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = decodeValue(value);
  }
  return out;
}

export interface RestDocument {
  id: string;
  data: Record<string, unknown>;
}

/**
 * Lista uma coleção via REST + HTTP nativo (CapacitorHttp no iOS).
 * Contorna o WebChannel do SDK Firestore, que trava no WKWebView.
 */
export async function listFirestoreCollection(collectionId: string): Promise<RestDocument[]> {
  const { projectId, apiKey } = getFirebaseWebConfig();
  const docs: RestDocument[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionId}`
    );
    url.searchParams.set('key', apiKey);
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    let res: Response;
    try {
      res = await nativeFetch(url.toString());
    } catch {
      res = await fetch(url.toString());
    }
    const body = await res.text();
    if (!res.ok) {
      throw new Error(`Firestore REST ${collectionId}: HTTP ${res.status} ${body.slice(0, 180)}`);
    }

    const json = JSON.parse(body || '{}') as {
      documents?: Array<{ name?: string; fields?: Record<string, unknown> }>;
      nextPageToken?: string;
    };

    for (const doc of json.documents ?? []) {
      const name = String(doc.name ?? '');
      const id = name.split('/').pop() ?? '';
      if (!id) continue;
      docs.push({ id, data: decodeFields(doc.fields ?? {}) });
    }

    pageToken = json.nextPageToken;
  } while (pageToken);

  return docs;
}

export function isCapacitorRuntime(): boolean {
  const env = (import.meta as { env?: Record<string, string> }).env ?? {};
  if (env.VITE_CAPACITOR_BUILD === 'true' || env.CAPACITOR_BUILD === 'true') return true;
  try {
    return typeof window !== 'undefined' && Boolean((window as { Capacitor?: unknown }).Capacitor);
  } catch {
    return false;
  }
}
