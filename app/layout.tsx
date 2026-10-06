import './globals.css';
import type { Metadata } from 'next';
import { Figtree } from 'next/font/google';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/auth-context';
import { I18nProvider } from '@/contexts/i18n-context';

const figtree = Figtree({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AgendaLash - Sistema de Gestión para Estudios de Pestañas',
  description: 'Agenda, fichas de clientas, insumos con cobertura proyectada y facturación para salones de belleza',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={figtree.className}>
        <AuthProvider>
          <I18nProvider>
            {children}
          </I18nProvider>
        </AuthProvider>
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}
