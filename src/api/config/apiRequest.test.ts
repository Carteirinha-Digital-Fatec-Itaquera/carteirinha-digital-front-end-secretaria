import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest, ApiRequestError } from './apiRequest';

describe('apiRequest helper', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('throws 401 before fetch when authenticated is true but no token is present', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    await expect(apiRequest('/events')).rejects.toThrow(ApiRequestError);
    await expect(apiRequest('/events')).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends Authorization header when token is present in sessionStorage', async () => {
    sessionStorage.setItem('token', 'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDB9.c2lnbmF0dXJl');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
    globalThis.fetch = fetchMock;

    const result = await apiRequest<{ success: boolean }>('/events');

    expect(result).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/events$/);
    const headers = init.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDB9.c2lnbmF0dXJl');
    expect(headers.get('Cache-Control')).toBe('no-store');
  });

  it('does NOT send Authorization header when authenticated is false', async () => {
    sessionStorage.setItem('token', 'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDB9.c2lnbmF0dXJl');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ valid: true }),
    });
    globalThis.fetch = fetchMock;

    const result = await apiRequest<{ valid: boolean }>('/certificates/verify/123', {
      authenticated: false,
    });

    expect(result).toEqual({ valid: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Headers;
    expect(headers.get('Authorization')).toBeNull();
  });

  it('sets Content-Type to application/json for object bodies', async () => {
    sessionStorage.setItem('token', 'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDB9.c2lnbmF0dXJl');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: '1' }),
    });
    globalThis.fetch = fetchMock;

    await apiRequest('/events', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Event' }),
    });

    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('throws ApiRequestError with response message and status on HTTP errors', async () => {
    sessionStorage.setItem('token', 'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDB9.c2lnbmF0dXJl');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ message: 'Evento não encontrado', code: 'EVENT_NOT_FOUND' }),
    });
    globalThis.fetch = fetchMock;

    await expect(apiRequest('/events/invalid-id')).rejects.toMatchObject({
      status: 404,
      message: 'Evento não encontrado',
      code: 'EVENT_NOT_FOUND',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('handles non-JSON error responses gracefully without masking the error', async () => {
    sessionStorage.setItem('token', 'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDB9.c2lnbmF0dXJl');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: async () => {
        throw new Error('Unexpected token');
      },
    });
    globalThis.fetch = fetchMock;

    await expect(apiRequest('/events')).rejects.toMatchObject({
      status: 502,
      message: 'Bad Gateway',
    });
  });

  it('returns undefined on status 204 No Content', async () => {
    sessionStorage.setItem('token', 'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDB9.c2lnbmF0dXJl');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => {
        throw new Error('No body');
      },
    });
    globalThis.fetch = fetchMock;

    const result = await apiRequest('/events/1', { method: 'DELETE' });
    expect(result).toBeUndefined();
  });
});
