import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSessionSnapshot, logoutSession, startSession, subscribeSession } from '../auth/session';
import { privateFetch } from './privateFetch';
import { apiRequest } from './apiRequest';
import { findById } from '../student/findById';
import { uploadStudentsFile } from '../secretary/uploadStudentsFile';
import { downloadHistorico } from '../student/downloadHistorico';
import { login } from '../auth/login';
import { Auth } from '../../domains/Auth';

const token = 'e30.eyJleHAiOjQxMDI0NDQ4MDB9.c2ln';
beforeEach(() => { startSession(token); });
afterEach(() => { logoutSession(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('private HTTP session boundary', () => {
  it('invalidates once for simultaneous private 401 responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    const listener = vi.fn();
    const stop = subscribeSession(listener);
    await Promise.allSettled([privateFetch('/a'), privateFetch('/b')]);
    stop();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getSessionSnapshot().token).toBeNull();
  });
  it.each([401, 200])('discards old response %s after a login with identical token', async status => {
    let resolve!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(r => { resolve = r; })));
    const request = privateFetch('/old');
    startSession(token);
    resolve(new Response('{}', { status }));
    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
    expect(getSessionSnapshot().token).toBe(token);
  });
  it('discards a body that finishes after logout', async () => {
    let resolve!: (value: unknown) => void;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, json: () => new Promise(r => { resolve = r; }) }));
    const response = await privateFetch('/slow');
    const body = response.json();
    logoutSession();
    resolve({ private: true });
    await expect(body).rejects.toMatchObject({ name: 'AbortError' });
  });
  it.each([403, 500, 503])('preserves the session on HTTP %s', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status })));
    await expect(apiRequest('/private')).rejects.toMatchObject({ status });
    expect(getSessionSnapshot().token).toBe(token);
  });
  it.each([new TypeError('offline'), new DOMException('cancelled', 'AbortError')])('preserves network/cancellation errors and signal', async error => {
    const fetchMock = vi.fn().mockRejectedValue(error);
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    await expect(privateFetch('/private', { signal: controller.signal })).rejects.toBe(error);
    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
    expect(getSessionSnapshot().token).toBe(token);
  });
  it('public 401 and incorrect login do not invalidate the session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response('{"message":"Credenciais inválidas"}', { status: 401 })));
    await expect(apiRequest('/public', { authenticated: false })).rejects.toMatchObject({ status: 401 });
    await login(new Auth({ email: 'fixture@example.test', password: 'fixture-only' }));
    expect(getSessionSnapshot().token).toBe(token);
  });
  it('legacy student fetch also invalidates on 401', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    await findById('fixture-ra');
    expect(getSessionSnapshot().token).toBeNull();
  });
  it('preserves upload FormData and browser-generated content type', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('"ok"'));
    vi.stubGlobal('fetch', fetchMock);
    await uploadStudentsFile(new File(['ra'], 'students.csv'));
    const init = fetchMock.mock.calls[0][1];
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.body.get('file').name).toBe('students.csv');
    expect(init.headers.get('Content-Type')).toBeNull();
    expect(init.headers.get('Authorization')).toBe(`Bearer ${token}`);
  });
  it('preserves binary downloads and revokes the temporary URL', async () => {
    const blob = new Blob(['ra,name\n1,Fixture']);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, ok: true, blob: async () => blob }));
    const createObjectURL = vi.fn(() => 'blob:fixture');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await downloadHistorico();
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fixture');
  });
});
