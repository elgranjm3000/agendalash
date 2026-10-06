'use client';

import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PrescriptionForm } from '@/components/prescription-form';
import { usePrescriptions } from '@/hooks/use-prescriptions';

export default function EditPrescriptionPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { prescriptions, loading, updatePrescription } = usePrescriptions();

  const prescription = prescriptions.find(p => p.id === params.id);

  const handleSubmit = async (prescriptionData: any) => {
    try {
      await updatePrescription(params.id, prescriptionData);
      toast.success('Prescripción actualizada correctamente');
      router.push('/prescriptions');
    } catch {
      toast.error('No se pudo guardar. Intentá de nuevo.');
    }
  };

  const handleCancel = () => {
    router.push('/prescriptions');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Prescripción no encontrada</h1>
        <p className="text-gray-600">Puede que haya sido eliminada.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Editar Prescripción</h1>
        <p className="text-gray-600 mt-1">Modifica los datos de la prescripción</p>
      </div>

      <PrescriptionForm
        prescription={prescription}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
}
