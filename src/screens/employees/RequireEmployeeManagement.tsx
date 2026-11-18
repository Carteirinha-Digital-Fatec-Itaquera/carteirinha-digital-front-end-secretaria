import { Navigate, Outlet } from 'react-router-dom';
import { inspectSessionToken } from '../../api/auth/session';
import { useSecretarySession } from '../../api/auth/useSecretarySession';

export default function RequireEmployeeManagement() {
  const { token } = useSecretarySession();
  return inspectSessionToken(token)?.payload.role === 'secretary' ? <Outlet /> : <Navigate to="/login" replace />;
}
