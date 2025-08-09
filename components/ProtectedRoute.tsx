import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { SpinnerIcon } from './Icons';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
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

  if (adminOnly && user.role !== 'admin') {
    // Redirect non-admins away from admin-only pages
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};