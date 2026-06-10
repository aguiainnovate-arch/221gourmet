import { Capacitor, CapacitorHttp } from '@capacitor/core';

function headersToRecord(headers?: HeadersInit): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) return out;

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }

  if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      out[key] = value;
    }
    return out;
  }

  return { ...headers };
}

async function readBody(body: BodyInit | null | undefined): Promise<string | undefined> {
  if (body == null) return undefined;
  if (typeof body === 'string') return body;
  if (body instanceof URLSearchParams) return body.toString();
  if (body instanceof ArrayBuffer) return new TextDecoder().decode(body);
  if (ArrayBuffer.isView(body)) {
    return new TextDecoder().decode(body);
  }
  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    return body.text();
  }
  return String(body);
}

/**
 * Fetch compatível com Capacitor nativo sem patch global (CapacitorHttp.enabled).
 * O patch global quebra Firestore; use este helper só em APIs externas (OpenAI, etc.).
 */
export async function nativeFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  if (!Capacitor.isNativePlatform()) {
    return fetch(input, init);
  }

  const request = input instanceof Request ? input : new Request(input, init);
  const method = request.method.toUpperCase();
  const headers = headersToRecord(request.headers);
  const body =
    request.body != null ? await readBody(await request.clone().text()) : undefined;

  const response = await CapacitorHttp.request({
    url: request.url,
    method,
    headers,
    data: body,
    responseType: 'text',
  });

  const responseHeaders = new Headers();
  if (response.headers && typeof response.headers === 'object') {
    for (const [key, value] of Object.entries(response.headers)) {
      if (typeof value === 'string') responseHeaders.set(key, value);
    }
  }

  const responseBody =
    typeof response.data === 'string'
      ? response.data
      : response.data != null
        ? JSON.stringify(response.data)
        : '';

  return new Response(responseBody, {
    status: response.status,
    headers: responseHeaders,
  });
}
