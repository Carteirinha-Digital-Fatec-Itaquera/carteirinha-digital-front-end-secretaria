import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { acknowledgeSessionNotice, checkSession, expireSession, getSessionSnapshot, inspectSessionToken, logoutSession, startSession, subscribeSession, watchSessionLifecycle } from './session';

const jwt = (payload: unknown) => `e30.${btoa(JSON.stringify(payload)).replace(/=/g, '')}.c2ln`;
beforeEach(() => { logoutSession(); localStorage.clear(); sessionStorage.clear(); });
afterEach(() => { vi.useRealTimers(); logoutSession(); });

describe('Secretary session', () => {
  it.each([null, '', 'invalid', 'a.b.c', 'bad.eyJleHAiOjQxMDI0NDQ4MDB9.c2ln', jwt({}), jwt({ exp: '99' }), jwt({ exp: null }), jwt({ exp: -1 })])('rejects absent/malformed/invalid exp: %s', token => {
    expect(inspectSessionToken(token, 1000)).toBeNull();
  });
  it('expires exactly at exp × 1000, without changing the backend TTL', () => {
    expect(inspectSessionToken(jwt({ exp: 2 }), 1999)).toMatchObject({ expiresAt: 2000 });
    expect(inspectSessionToken(jwt({ exp: 2 }), 2000)).toBeNull();
  });
  it('does not authenticate saved profile or notify a new visitor', () => {
    localStorage.setItem('profile', '{"name":"Fixture"}');
    expect(checkSession().token).toBeNull();
    expect(getSessionSnapshot().notice).toBe(false);
  });
  it('clears invalid stored tokens and issues a consumable notice once', () => {
    localStorage.setItem('token', 'invalid');
    checkSession();
    expect(localStorage.getItem('token')).toBeNull();
    expect(getSessionSnapshot().notice).toBe(true);
    acknowledgeSessionNotice();
    checkSession();
    expect(getSessionSnapshot().notice).toBe(false);
  });
  it('notifies consumers once for concurrent invalidations and preserves preferences', () => {
    startSession(jwt({ exp: 4102444800 }));
    localStorage.setItem('theme', 'dark');
    const context = getSessionSnapshot();
    const notify = vi.fn();
    const stop = subscribeSession(notify);
    expireSession(context, 'unauthorized');
    expireSession(context, 'unauthorized');
    stop();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(localStorage.getItem('token')).toBeNull();
  });
  it('ignores previous generations even if login returns the exact same token', () => {
    const token = jwt({ exp: 4102444800 });
    startSession(token);
    const previous = getSessionSnapshot();
    startSession(token);
    expireSession(previous, 'unauthorized');
    expect(getSessionSnapshot().generation).toBeGreaterThan(previous.generation);
    expect(getSessionSnapshot().token).toBe(token);
    expect(getSessionSnapshot().notice).toBe(false);
  });
  it('voluntary logout never displays expiration', () => {
    startSession(jwt({ exp: 4102444800 }));
    logoutSession();
    expect(getSessionSnapshot().notice).toBe(false);
  });
  it('expires on the active deadline without polling', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    startSession(jwt({ exp: 3 }));
    const initialTimers = vi.getTimerCount();
    const stop = watchSessionLifecycle();
    expect(vi.getTimerCount()).toBe(initialTimers + 1);
    vi.advanceTimersByTime(1999);
    expect(getSessionSnapshot().token).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(getSessionSnapshot().token).toBeNull();
    stop();
    vi.runAllTicks();
    expect(vi.getTimerCount()).toBe(initialTimers);
  });
  it.each(['focus', 'pageshow', 'visibilitychange'])('recalculates expiry after suspension on %s', event => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    startSession(jwt({ exp: 3 }));
    const stop = watchSessionLifecycle();
    vi.setSystemTime(4000); // suspended timers did not run
    (event === 'visibilitychange' ? document : window).dispatchEvent(new Event(event));
    expect(getSessionSnapshot().token).toBeNull();
    expect(getSessionSnapshot().notice).toBe(true);
    stop();
  });
  it('persists across tab closure and migrates a legacy session without extending its JWT', () => {
    const token = jwt({ exp: 4102444800 });
    sessionStorage.setItem('token', token);
    expect(checkSession().token).toBe(token);
    expect(localStorage.getItem('token')).toBe(token);
    expect(sessionStorage.getItem('token')).toBeNull();
    sessionStorage.clear();
    expect(checkSession().token).toBe(token);
    logoutSession();
    expect(localStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('token')).toBeNull();
  });
  it('schedules a 30-day JWT beyond the browser timer limit and expires exactly at its deadline', () => {
    vi.useFakeTimers();
    const start = Date.UTC(2026, 9, 26);
    vi.setSystemTime(start);
    const lifetime = 30 * 86400000;
    startSession(jwt({ exp: (start + lifetime) / 1000 }));
    const stop = watchSessionLifecycle();
    vi.advanceTimersByTime(2147483647);
    expect(getSessionSnapshot().token).not.toBeNull();
    vi.advanceTimersByTime(lifetime - 2147483647 - 1);
    expect(getSessionSnapshot().token).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(getSessionSnapshot().token).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    stop();
  });
  it('applies logout from another tab on the storage event', () => {
    startSession(jwt({ exp: 4102444800 }));
    const stop = watchSessionLifecycle();
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('storage'));
    expect(getSessionSnapshot().token).toBeNull();
    stop();
  });

});
