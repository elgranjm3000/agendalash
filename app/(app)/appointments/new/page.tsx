'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AppointmentForm } from '@/components/appointment-form';
import { useAppointments } from '@/hooks/use-appointments';

export default function NewAppointmentPage() {
  const router = useRouter();
  const { addAppointment } = useAppointments();

  const handleSubmit = async (appointmentData: any) => {
    try {
      await addAppointment(appointmentData);
      toast.success('Cita creada correctamente');
      router.push('/appointments');
    } catch {
      toast.error('No se pudo guardar. Intentá de nuevo.');
    }
  };

  const handleCancel = () => {
    router.push('/appointments');
  };

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Nueva Cita</h1>
        <p className="text-gray-600 mt-1">
          Programa una nueva cita
        </p>
      </div>
      
      <AppointmentForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
}