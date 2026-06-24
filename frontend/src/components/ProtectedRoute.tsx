import { Navigate } from 'react-router';
import { useAuth } from '../auth/useAuth';
import { PageSpinner } from './Spinner';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isGuest, isLoading } = useAuth();

  if (isLoading) return <PageSpinner />;
  if (!isAuthenticated && !isGuest) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
