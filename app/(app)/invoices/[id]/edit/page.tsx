'use client';

import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { InvoiceForm } from '@/components/invoice-form';
import { useInvoices } from '@/hooks/use-invoices';

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { invoices, loading, updateInvoice } = useInvoices();

  const invoice = invoices.find(i => i.id === params.id);

  const handleSubmit = async (invoiceData: any) => {
    try {
      await updateInvoice(params.id, invoiceData);
      toast.success('Factura actualizada correctamente');
      router.push('/invoices');
    } catch {
      toast.error('No se pudo guardar. Intentá de nuevo.');
    }
  };

  const handleCancel = () => {
    router.push('/invoices');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Factura no encontrada</h1>
        <p className="text-gray-600">Puede que haya sido eliminada.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Editar Factura</h1>
        <p className="text-gray-600 mt-1">Modifica los datos de la factura</p>
      </div>

      <InvoiceForm
        invoice={invoice}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
}
