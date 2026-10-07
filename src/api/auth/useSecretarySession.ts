import { useEffect, useSyncExternalStore } from 'react';
import { checkSession, getSessionSnapshot, subscribeSession } from './session';

export function useSecretarySession() {
  const session = useSyncExternalStore(subscribeSession, getSessionSnapshot);
  useEffect(() => { checkSession(); }, []);
  return session;
}
