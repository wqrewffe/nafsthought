import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { SpinnerIcon } from './Icons';

interface ProtectedRouteProps {
  children: ReactNode;
  adminOnly?: boolean;
}

export const ProtectedRoute = ({ children, adminOnly = false }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
        <div className="flex-grow flex items-center justify-center min-h-[calc(100vh-200px)]">
            <SpinnerIcon className="w-12 h-12 text-blue-600" />
        </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    // Redirect non-admins away from admin-only pages
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};