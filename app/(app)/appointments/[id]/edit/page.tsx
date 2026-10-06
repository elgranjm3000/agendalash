'use client';

import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppointmentForm } from '@/components/appointment-form';
import { useAppointments } from '@/hooks/use-appointments';

export default function EditAppointmentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { appointments, loading, updateAppointment } = useAppointments();

  const appointment = appointments.find(a => a.id === params.id);

  const handleSubmit = async (appointmentData: any) => {
    try {
      await updateAppointment(params.id, appointmentData);
      toast.success('Cita actualizada correctamente');
      router.push('/appointments');
    } catch {
      toast.error('No se pudo guardar. Intentá de nuevo.');
    }
  };

  const handleCancel = () => {
    router.push('/appointments');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Cita no encontrada</h1>
        <p className="text-gray-600">Puede que haya sido eliminada.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Editar Cita</h1>
        <p className="text-gray-600 mt-1">Modifica los datos de la cita</p>
      </div>

      <AppointmentForm
        appointment={appointment}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
}
