import { privateFetch, SessionRequestError } from './privateFetch';
import { GLOBAL_VAR } from './globalVar';

export type RequestOptions = {
  signal?: AbortSignal;
};

export type ApiRequestOptions = RequestInit & {
  authenticated?: boolean;
};

export class ApiRequestError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { authenticated = true, headers: customHeaders, ...fetchOptions } = options;

  const baseUrl = (GLOBAL_VAR.BASE_URL || '').replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${baseUrl}${normalizedPath}`;

  const headers = new Headers(customHeaders);
  headers.set('Cache-Control', 'no-store');

  if (!authenticated) headers.delete('Authorization');

  if (fetchOptions.body && !(fetchOptions.body instanceof FormData)) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  let response: Response;
  try {
    response = await (authenticated ? privateFetch : fetch)(url, { ...fetchOptions, headers });
  } catch (error) {
    if (error instanceof SessionRequestError) {
      throw new ApiRequestError(401, error.message, error.code);
    }
    throw error;
  }

  if (!response.ok) {
    let errorData: { message?: string; error?: string; code?: string } | null = null;
    try {
      errorData = await response.json();
    } catch {
      // resposta sem corpo ou não-JSON
    }

    const message = errorData?.message || errorData?.error || response.statusText || 'Erro na requisição';
    const code = errorData?.code;

    throw new ApiRequestError(response.status, message, code);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return (await response.json()) as T;
}
