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

    const res = await firestoreFetch(url.toString());
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

async function firestoreFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await nativeFetch(url, init);
  } catch {
    return fetch(url, init);
  }
}

function encodeStringValue(value: string): Record<string, unknown> {
  return { stringValue: value };
}

function encodeFirestoreValue(value: unknown): Record<string, unknown> {
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.filter((item) => item !== undefined).map(encodeFirestoreValue),
      },
    };
  }
  if (typeof value === 'object') {
    const fields: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (nested === undefined) continue;
      fields[key] = encodeFirestoreValue(nested);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function encodeFirestoreFields(data: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    fields[key] = encodeFirestoreValue(value);
  }
  return fields;
}

/**
 * Query simples por igualdade de campo (REST runQuery).
 * Usado no Capacitor para evitar o SDK Firestore travar no login.
 */
export async function queryFirestoreByField(
  collectionId: string,
  fieldPath: string,
  value: string,
  limit = 300
): Promise<RestDocument[]> {
  const { projectId, apiKey } = getFirebaseWebConfig();
  const url = new URL(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`
  );
  url.searchParams.set('key', apiKey);

  const res = await firestoreFetch(url.toString(), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath },
            op: 'EQUAL',
            value: encodeStringValue(value),
          },
        },
        limit,
      },
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Firestore REST query ${collectionId}: HTTP ${res.status} ${body.slice(0, 180)}`);
  }

  const rows = JSON.parse(body || '[]') as Array<{
    document?: { name?: string; fields?: Record<string, unknown> };
  }>;

  const docs: RestDocument[] = [];
  for (const row of rows) {
    const name = String(row.document?.name ?? '');
    const id = name.split('/').pop() ?? '';
    if (!id || !row.document) continue;
    docs.push({ id, data: decodeFields(row.document.fields ?? {}) });
  }
  return docs;
}

/** Lê um documento por ID via REST. */
export async function getFirestoreDocument(
  collectionId: string,
  documentId: string
): Promise<RestDocument | null> {
  const { projectId, apiKey } = getFirebaseWebConfig();
  const url = new URL(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionId}/${documentId}`
  );
  url.searchParams.set('key', apiKey);

  const res = await firestoreFetch(url.toString());
  if (res.status === 404) return null;
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Firestore REST get ${collectionId}/${documentId}: HTTP ${res.status} ${body.slice(0, 180)}`);
  }
  const json = JSON.parse(body || '{}') as {
    name?: string;
    fields?: Record<string, unknown>;
  };
  const id = String(json.name ?? '').split('/').pop() || documentId;
  return { id, data: decodeFields(json.fields ?? {}) };
}

/** Cria documento via REST (necessário no Capacitor — addDoc do SDK trava). */
export async function createFirestoreDocument(
  collectionId: string,
  data: Record<string, unknown>
): Promise<RestDocument> {
  const { projectId, apiKey } = getFirebaseWebConfig();
  const url = new URL(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionId}`
  );
  url.searchParams.set('key', apiKey);

  const res = await firestoreFetch(url.toString(), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: encodeFirestoreFields(data) }),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Firestore REST create ${collectionId}: HTTP ${res.status} ${body.slice(0, 180)}`);
  }

  const json = JSON.parse(body || '{}') as {
    name?: string;
    fields?: Record<string, unknown>;
  };
  const id = String(json.name ?? '').split('/').pop() ?? '';
  if (!id) throw new Error(`Firestore REST create ${collectionId}: resposta sem id`);
  return { id, data: decodeFields(json.fields ?? {}) };
}

/** Patch parcial via REST. */
export async function updateFirestoreDocument(
  collectionId: string,
  documentId: string,
  data: Record<string, unknown>
): Promise<void> {
  const { projectId, apiKey } = getFirebaseWebConfig();
  const fieldPaths = Object.keys(data).filter((key) => data[key] !== undefined);
  const url = new URL(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionId}/${documentId}`
  );
  url.searchParams.set('key', apiKey);
  for (const path of fieldPaths) {
    url.searchParams.append('updateMask.fieldPaths', path);
  }

  const res = await firestoreFetch(url.toString(), {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: encodeFirestoreFields(data) }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Firestore REST update ${collectionId}/${documentId}: HTTP ${res.status} ${body.slice(0, 180)}`);
  }
}

/** Delete via REST. */
export async function deleteFirestoreDocument(
  collectionId: string,
  documentId: string
): Promise<void> {
  const { projectId, apiKey } = getFirebaseWebConfig();
  const url = new URL(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionId}/${documentId}`
  );
  url.searchParams.set('key', apiKey);

  const res = await firestoreFetch(url.toString(), { method: 'DELETE' });
  if (res.status === 404) return;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Firestore REST delete ${collectionId}/${documentId}: HTTP ${res.status} ${body.slice(0, 180)}`);
  }
}
