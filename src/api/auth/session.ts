/** Local JWT inspection is only an expiry check; the backend validates authenticity. */
export function inspectSessionToken(token: string | null, nowMs = Date.now()) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part) || part.length % 4 === 1)) return null;
    const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
    if (!header || typeof header !== 'object' || Array.isArray(header)) return null;
    const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')), char => char.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!payload || typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) return null;
    const expiresAt = payload.exp * 1000;
    return Number.isFinite(expiresAt) && expiresAt > nowMs ? { expiresAt, payload: payload as Record<string, unknown> } : null;
  } catch { return null; }
}

export type SessionContext = { token: string | null; generation: number };
type SessionState = SessionContext & { notice: boolean };
function readToken() {
  try { return sessionStorage.getItem('token'); } catch { return null; }
}
let state: SessionState = { token: readToken(), generation: 0, notice: false };
const listeners = new Set<() => void>();
export const getSessionSnapshot = () => state;
export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function publish(next: SessionState) {
  state = next;
  listeners.forEach(listener => listener());
}
function clearPrivateStorage() {
  // This frontend currently persists only its token. Keep unrelated preferences.
  try { sessionStorage.removeItem('token'); } catch { /* storage unavailable */ }
}
export function isCurrentSession(context: SessionContext) {
  return context.token === state.token && context.generation === state.generation;
}
export function expireSession(context: SessionContext, reason: 'expired' | 'unauthorized' | 'logout') {
  if (!isCurrentSession(context)) return;
  const hadSession = state.token !== null;
  clearPrivateStorage();
  if (!hadSession && (reason !== 'logout' || !state.notice)) return;
  publish({ token: null, generation: state.generation + 1, notice: reason !== 'logout' && hadSession });
}
export function checkSession() {
  const stored = readToken();
  if (stored !== state.token) {
    if (!stored && state.token) expireSession(state, 'expired');
    else publish({ token: stored, generation: state.generation + 1, notice: false });
  }
  if (state.token && !inspectSessionToken(state.token)) expireSession(state, 'expired');
  return state;
}
export function startSession(token: string) {
  if (!inspectSessionToken(token)) throw new Error('Token de sessão inválido. Entre novamente.');
  sessionStorage.setItem('token', token);
  // Always advance, even when the backend returns the same JWT on another login.
  publish({ token, generation: state.generation + 1, notice: false });
}
export function logoutSession() {
  expireSession(state, 'logout');
  clearPrivateStorage();
}
export function acknowledgeSessionNotice() {
  if (state.notice) publish({ ...state, notice: false });
}
/** One deadline, recalculated after background suspension; no session polling. */
export function watchSessionLifecycle() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    clearTimeout(timer);
    const inspected = inspectSessionToken(state.token);
    if (inspected && document.visibilityState !== 'hidden') {
      timer = setTimeout(() => { checkSession(); schedule(); }, Math.min(inspected.expiresAt - Date.now(), 2147483647));
    }
  };
  const resume = () => { checkSession(); schedule(); };
  const unsubscribe = subscribeSession(schedule);
  window.addEventListener('focus', resume);
  window.addEventListener('pageshow', resume);
  document.addEventListener('visibilitychange', resume);
  resume();
  return () => {
    clearTimeout(timer);
    unsubscribe();
    window.removeEventListener('focus', resume);
    window.removeEventListener('pageshow', resume);
    document.removeEventListener('visibilitychange', resume);
  };
}
