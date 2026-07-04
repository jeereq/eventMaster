import * as SecureStore from 'expo-secure-store';
import { env } from '../config/env';

const TOKEN_KEY = 'eventmaster_token';

export interface ApiError extends Error {
  status?: number;
  data?: Record<string, unknown>;
}

interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string | null): Promise<void> {
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

export async function hasStoredToken(): Promise<boolean> {
  const token = await getToken();
  return Boolean(token);
}

async function request<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const token = await getToken();
  const headers = new Headers(options.headers ?? {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const isFormData = options.body instanceof FormData;
  if (!isFormData && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      ...options,
      headers,
      body:
        options.body === undefined
          ? undefined
          : isFormData
            ? (options.body as BodyInit)
            : JSON.stringify(options.body),
    });
  } catch {
    throw new Error('Impossible de joindre le serveur. Vérifiez que le backend est démarré.');
  }

  if (response.status === 204) {
    return null as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const err = new Error(
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: string }).error)
        : `Erreur serveur (${response.status})`,
    ) as ApiError;
    err.status = response.status;
    err.data = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : undefined;
    throw err;
  }

  return data as T;
}

export const api = {
  get: <T = unknown>(path: string, options?: FetchOptions) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T = unknown>(path: string, body?: unknown, options?: FetchOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T = unknown>(path: string, body?: unknown, options?: FetchOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T = unknown>(path: string, body?: unknown, options?: FetchOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T = unknown>(path: string, options?: FetchOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};

export { TOKEN_KEY };
