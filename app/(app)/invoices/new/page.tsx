'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { InvoiceForm } from '@/components/invoice-form';
import { useInvoices } from '@/hooks/use-invoices';

export default function NewInvoicePage() {
  const router = useRouter();
  const { addInvoice } = useInvoices();

  const handleSubmit = async (invoiceData: any) => {
    try {
      await addInvoice(invoiceData);
      toast.success('Factura creada correctamente');
      router.push('/invoices');
    } catch {
      toast.error('No se pudo guardar. Intentá de nuevo.');
    }
  };

  const handleCancel = () => {
    router.push('/invoices');
  };

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Nueva Factura</h1>
        <p className="text-gray-600 mt-1">
          Crea una nueva factura para una clienta
        </p>
      </div>
      
      <InvoiceForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
}