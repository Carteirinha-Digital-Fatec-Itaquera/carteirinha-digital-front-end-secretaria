import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

interface RequireSecretarySessionProps {
  children?: React.ReactNode;
}

export function RequireSecretarySession({ children }: RequireSecretarySessionProps) {
  const token = sessionStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

export default RequireSecretarySession;
