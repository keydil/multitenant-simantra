// Pengganti lib/supabase/client.ts. Base URL + access token (in-memory,
// BUKAN localStorage — lihat FRONTEND_MIGRATION.md §2) + auto-refresh
// sekali saat 401 lewat cookie httpOnly `simantra_refresh`.

const API_BASE = process.env.NEXT_PUBLIC_API_URL!;

export interface ApiErrorBody {
  statusCode: number;
  message: string;
  error?: string;
}

export class ApiError extends Error {
  statusCode: number;
  error?: string;

  constructor(body: ApiErrorBody) {
    super(body.message || 'Terjadi kesalahan');
    this.name = 'ApiError';
    this.statusCode = body.statusCode;
    this.error = body.error;
  }
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export interface AuthResult<TUser = unknown> {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: TUser;
}

// Refresh sedang berjalan di-share ke semua request yang nabrak 401
// bersamaan, supaya cuma satu POST /auth/refresh yang keluar.
let refreshPromise: Promise<AuthResult | null> | null = null;

// Dipakai juga oleh auth-context saat bootstrap (baca sesi dari cookie
// httpOnly `simantra_refresh`) — mengembalikan body penuh (termasuk user)
// supaya gak perlu panggilan /auth/me terpisah.
export async function refreshSession<TUser = unknown>(): Promise<AuthResult<TUser> | null> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) {
          accessToken = null;
          return null;
        }
        const data = (await res.json()) as AuthResult;
        accessToken = data.access_token;
        return data;
      })
      .catch(() => {
        accessToken = null;
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise as Promise<AuthResult<TUser> | null>;
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  // false utk login/refresh/logout: jangan lampirkan bearer & jangan coba
  // auto-refresh saat 401 (401 di situ artinya kredensial salah, bukan
  // token kedaluwarsa).
  auth?: boolean;
}

async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { auth = true, headers, body, ...rest } = options;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const serializedBody = body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body);

  const doFetch = () => {
    const h = new Headers(headers);
    if (!isFormData && serializedBody !== undefined && !h.has('Content-Type')) {
      h.set('Content-Type', 'application/json');
    }
    if (auth && accessToken) {
      h.set('Authorization', `Bearer ${accessToken}`);
    }
    return fetch(`${API_BASE}${path}`, {
      ...rest,
      headers: h,
      body: serializedBody,
      credentials: path.startsWith('/auth') ? 'include' : rest.credentials,
    });
  };

  let res = await doFetch();

  if (res.status === 401 && auth) {
    const refreshed = await refreshSession();
    if (refreshed) {
      res = await doFetch();
    }
  }

  if (!res.ok) {
    let errBody: ApiErrorBody;
    try {
      errBody = await res.json();
    } catch {
      errBody = { statusCode: res.status, message: res.statusText };
    }
    throw new ApiError(errBody);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
};
