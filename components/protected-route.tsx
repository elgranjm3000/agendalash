'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { LoginForm } from '@/components/login-form';

/** Rutas públicas accesibles sin sesión. */
const PUBLIC_PATHS = ['/', '/registrarse'];

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const isPublicPath = PUBLIC_PATHS.some((p) => (p === '/' ? pathname === '/' : pathname.startsWith(p)));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  if (!user && isPublicPath) {
    return <>{children}</>;
  }

  if (!user) {
    return <LoginForm />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
