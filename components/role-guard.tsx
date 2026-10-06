'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useLang } from '@/contexts/i18n-context';

/**
 * Guardia de ruta por rol: oculta el contenido de la página si el usuario
 * no tiene uno de los roles permitidos, aunque escriba la URL directamente.
 */
export function RoleGuard({ allowedRoles, children }: { allowedRoles: string[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const { lang } = useLang();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600" />
      </div>
    );
  }

  if (user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {lang === 'es' ? 'Acceso Denegado' : 'Access Denied'}
          </h1>
          <p className="text-gray-600">
            {lang === 'es'
              ? 'No tenés permisos para acceder a esta sección.'
              : "You don't have permission to access this section."}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
