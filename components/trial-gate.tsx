'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Clock, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const DAYS_LEFT_WARN = 3;

function daysLeft(trialEndsAt: string): number {
  return Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

/**
 * Candado de licencia: si la organización está en prueba y esta venció,
 * bloquea el sistema con un llamado a solicitar la licencia. Si faltan
 * pocos días, muestra un aviso discreto sin interrumpir.
 */
export function TrialGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // Super admin y organizaciones con licencia no tienen candado
  if (!user || user.role === 'super_admin' || !user.trialEndsAt) {
    return <>{children}</>;
  }

  const left = daysLeft(user.trialEndsAt);

  // Prueba vencida: bloquear
  if (left <= 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
            <ShieldCheck className="h-7 w-7 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tu prueba finalizó</h1>
          <p className="text-gray-600 mb-6">
            El período de prueba de 7 días de <strong>{user.organizationName}</strong> terminó.
            Solicitá tu licencia para seguir usando AgendaLash — tus datos están a salvo y
            se conservan intactos.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild className="min-h-[44px]">
              <a
                href={`mailto:${process.env.NEXT_PUBLIC_SALES_EMAIL ?? 'elgranjm3000@gmail.com'}?subject=${encodeURIComponent('Solicitud de licencia — ' + (user.organizationName ?? ''))}`}
              >
                Solicitar licencia
              </a>
            </Button>
            <Button variant="outline" asChild className="min-h-[44px]">
              <Link href="/">Cerrar sesión</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Prueba por vencer: aviso sin interrumpir
  return (
    <>
      {left <= DAYS_LEFT_WARN && (
        <div className={cn(
          'flex items-center justify-center gap-2 text-sm font-medium px-4 py-2',
          left <= 1 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
        )}>
          <Clock className="h-4 w-4" />
          {left === 1
            ? 'Tu prueba gratuita termina mañana.'
            : `Te quedan ${left} días de prueba gratuita.`}
          <a
            href={`mailto:${process.env.NEXT_PUBLIC_SALES_EMAIL ?? 'elgranjm3000@gmail.com'}?subject=${encodeURIComponent('Solicitud de licencia — ' + (user.organizationName ?? ''))}`}
            className="underline font-semibold"
          >
            Solicitar licencia
          </a>
        </div>
      )}
      {children}
    </>
  );
}
