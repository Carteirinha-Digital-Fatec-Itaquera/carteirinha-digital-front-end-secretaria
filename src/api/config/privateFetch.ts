import { checkSession, expireSession, isCurrentSession, type SessionContext } from '../auth/session';

export class SessionRequestError extends Error {
  readonly status = 401;
  readonly code = 'UNAUTHORIZED';
  constructor() { super('Sessão expirada ou não autenticada'); }
}
function assertCurrent(context: SessionContext) {
  checkSession();
  if (!isCurrentSession(context) || !context.token) {
    throw new DOMException('Resultado de uma sessão encerrada descartado', 'AbortError');
  }
}
/** Preserve Response/body formats and caller cancellation while rejecting stale results. */
export async function privateFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const context = checkSession();
  if (!context.token) throw new SessionRequestError();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${context.token}`);
  const response = await fetch(input, { ...init, headers, cache: 'no-store' });
  assertCurrent(context);
  if (response.status === 401) {
    expireSession(context, 'unauthorized');
    return response;
  }
  // Body consumption can finish after logout too (large files/slow streams).
  return new Proxy(response, {
    get(target, property) {
      const value = Reflect.get(target, property, target);
      if (['json', 'text', 'blob', 'arrayBuffer', 'formData', 'bytes'].includes(String(property)) && typeof value === 'function') {
        return async (...args: unknown[]) => {
          const body = await value.apply(target, args);
          assertCurrent(context);
          return body;
        };
      }
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}
