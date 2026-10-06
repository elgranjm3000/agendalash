'use client';

import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PatientForm } from '@/components/patient-form';
import { usePatients } from '@/hooks/use-patients';

export default function EditPatientPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { patients, loading, updatePatient } = usePatients();

  const patient = patients.find(p => p.id === params.id);

  const handleSubmit = async (patientData: any) => {
    try {
      await updatePatient(params.id, patientData);
      toast.success('Clienta actualizada correctamente');
      router.push('/patients');
    } catch {
      toast.error('No se pudo guardar. Intentá de nuevo.');
    }
  };

  const handleCancel = () => {
    router.push('/patients');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Clienta no encontrada</h1>
        <p className="text-gray-600">Puede que haya sido eliminado.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Editar Clienta</h1>
        <p className="text-gray-600 mt-1">Modifica los datos de la clienta</p>
      </div>

      <PatientForm
        patient={patient}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
}
