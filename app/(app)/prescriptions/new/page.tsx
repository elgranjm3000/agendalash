'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { PrescriptionForm } from '@/components/prescription-form';
import { usePrescriptions } from '@/hooks/use-prescriptions';

function NewPrescriptionContent() {
  const router = useRouter();
  const search = useSearchParams();
  const { addPrescription } = usePrescriptions();

  const initialPatientId = search?.get('patient') ?? undefined;
  const recordId = search?.get('record');

  const handleSubmit = async (prescriptionData: any) => {
    try {
      const created = await addPrescription(prescriptionData);
      toast.success('Indicación creada correctamente');
      const warnings = (created as { _warnings?: { item: string; reason: string }[] })._warnings;
      if (warnings?.length) {
        const detail = warnings
          .map((w) => w.reason === 'no_existe' ? `"${w.item}" no está en inventario` : `"${w.item}" sin stock suficiente`)
          .join(' · ');
        toast.warning(`Inventario: ${detail}`);
      }
      router.push(recordId ? `/records?patient=${initialPatientId}` : '/prescriptions');
    } catch {
      toast.error('No se pudo guardar. Intentá de nuevo.');
    }
  };

  const handleCancel = () => {
    router.push(recordId ? `/records?patient=${initialPatientId}` : '/prescriptions');
  };

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Nueva Indicación</h1>
        <p className="text-gray-600 mt-1">
          Crea una nueva indicación de servicio
        </p>
      </div>

      <PrescriptionForm
        initialPatientId={initialPatientId}
        recordId={recordId}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
}

export default function NewPrescriptionPage() {
  return (
    <Suspense>
      <NewPrescriptionContent />
    </Suspense>
  );
}
