'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Vista de documento imprimible (A4): en pantalla muestra una barra de acciones
 * y el papel; al imprimir (Ctrl+P o "Imprimir / Guardar PDF") solo se imprime
 * el documento, sin la interfaz de la app.
 */
export function PrintDocument({
  fetchDoc,
  children,
}: {
  fetchDoc: () => Promise<unknown>;
  children: (doc: any) => ReactNode;
}) {
  const router = useRouter();
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchDoc()
      .then((d) => {
        if (d) setDoc(d);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [fetchDoc]);

  return (
    <div className="max-w-4xl mx-auto px-4">
      <style>{`
        @media print {
          aside, .print-toolbar, .lg\:hidden { display: none !important; }
          main { padding: 0 !important; }
          .print-paper { box-shadow: none !important; border: none !important; margin: 0 !important; max-width: none !important; width: 100% !important; }
        }
        @page { size: A4; margin: 12mm; }
      `}</style>

      <div className="print-toolbar flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="min-h-[40px]">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <Button onClick={() => window.print()} disabled={!doc} className="flex items-center gap-2 min-h-[44px]">
          <Printer className="h-4 w-4" />
          Imprimir / Guardar PDF
        </Button>
      </div>

      {loading && (
        <div className="py-24 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
        </div>
      )}

      {!loading && notFound && (
        <div className="py-24 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Documento no encontrado</h1>
          <p className="text-gray-600">Puede que haya sido eliminado.</p>
        </div>
      )}

      {!loading && doc && (
        <div className="print-paper bg-white shadow-lg border border-gray-200 rounded-lg mx-auto p-8 md:p-12 min-h-[600px] text-gray-900">
          {children(doc)}
        </div>
      )}
    </div>
  );
}

/** Nombre de la organización del usuario logueado, para los encabezados de documentos. */
export function useOrganizationName(): string {
  const [name, setName] = useState('');
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('medical_current_user') : null;
    const id = stored ? (JSON.parse(stored)?.id as string | undefined) : undefined;
    if (!id) return;
    fetch('/api/auth/me', { headers: { 'x-user-id': id } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setName(d?.organizationName ?? ''))
      .catch(() => {});
  }, []);
  return name;
}
