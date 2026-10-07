import { Fragment, useEffect, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { checkSession, inspectSessionToken } from '../../api/auth/session';
import { useSecretarySession } from '../../api/auth/useSecretarySession';

export function RequireSecretarySession({ children }: { children?: ReactNode }) {
  const session = useSecretarySession();
  const location = useLocation();
  useEffect(() => { checkSession(); }, [location.key]);
  if (!inspectSessionToken(session.token)) return <Navigate to="/login" replace />;
  // Remount all private state on any session change, including identical-token logins.
  return <Fragment key={session.generation}>{children ?? <Outlet />}</Fragment>;
}
export default RequireSecretarySession;
