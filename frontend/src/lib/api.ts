const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:5001/api';
// const API_URL = "https://eventmaster-backend-ysgk.onrender.com/api"
// API_URL=http://localhost:5001/api var environnement local
// API_URL=https://eventmaster.itmafrica.com var environnement production

interface FetchOptions extends RequestInit {
  body?: any;
}

async function request(path: string, options: FetchOptions = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const isFormData = options.body instanceof FormData;
  if (!isFormData && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  if (options.body) {
    config.body = isFormData ? options.body : JSON.stringify(options.body);
  }

  try {
    const response = await fetch(`${API_URL}${path}`, config);

    if (response.status === 204) {
      return null;
    }

    const data = await response.json();

    if (!response.ok) {
      const err = new Error(data.error || 'Une erreur est survenue') as Error & {
        status?: number;
        data?: Record<string, unknown>;
      };
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (error: any) {
    console.error(`API Fetch Error [${path}]:`, error);
    throw error;
  }
}

export const api = {
  get: (path: string, options?: FetchOptions) => request(path, { ...options, method: 'GET' }),
  post: (path: string, body?: any, options?: FetchOptions) => request(path, { ...options, method: 'POST', body }),
  put: (path: string, body?: any, options?: FetchOptions) => request(path, { ...options, method: 'PUT', body }),
  delete: (path: string, options?: FetchOptions) => request(path, { ...options, method: 'DELETE' }),
};
