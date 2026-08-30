import { Navigate } from 'react-router-dom';
import { loadSession } from '../../lib/session';

export function RequireAuth({ children }: { children: React.ReactElement }) {
  const user = loadSession();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
