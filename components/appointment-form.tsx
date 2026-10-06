'use client';
import { useLang } from '@/contexts/i18n-context';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Appointment, Patient } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PatientCombobox } from '@/components/patient-combobox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePatients } from '@/hooks/use-patients';
import { useUsers } from '@/hooks/use-users';
import { useAuth } from '@/contexts/auth-context';

interface AppointmentFormProps {
  appointment?: Appointment;
  onSubmit: (data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const appointmentTypes = [
  { value: 'consultation', label: 'Consulta' },
  { value: 'checkup', label: 'Chequeo' },
  { value: 'procedure', label: 'Procedimiento' },
  { value: 'follow-up', label: 'Seguimiento' },
];

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00'
];

export function AppointmentForm({ appointment, onSubmit, onCancel }: AppointmentFormProps) {
  const { t } = useLang();
  const [loading, setLoading] = useState(false);
  const { patients } = usePatients();
  const { getDoctors } = useUsers();
  const { user } = useAuth();
  const doctors = getDoctors();
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: appointment ? {
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      date: appointment.date,
      time: appointment.time,
      duration: appointment.duration,
      type: appointment.type,
      status: appointment.status,
      notes: appointment.notes || '',
    } : {
      doctorId: user?.role === 'doctor' ? user.id : '',
      duration: 30,
      type: 'consultation',
      status: 'scheduled',
    }
  });

  const selectedPatientId = watch('patientId');
  const selectedDoctorId = watch('doctorId');
  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);

  const handleFormSubmit = async (data: any) => {
    setLoading(true);
    try {
      const patientName = selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : '';
      const doctorName = selectedDoctor ? `${selectedDoctor.firstName} ${selectedDoctor.lastName}` : '';
      await onSubmit({
        ...data,
        patientName,
        doctorName,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {appointment ? 'Editar Cita' : 'Nueva Cita'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="patientId">{t('Clienta')}</Label>
            <PatientCombobox
              patients={patients}
              value={selectedPatientId || ''}
              onValueChange={(value) => setValue('patientId', value)}
            />
            {errors.patientId && (
              <p className="text-sm text-red-600 mt-1">Debe seleccionar una clienta</p>
            )}
          </div>

          <div>
            <Label htmlFor="doctorId">Profesional</Label>
            <Select 
              onValueChange={(value) => setValue('doctorId', value)} 
              defaultValue={appointment?.doctorId || (user?.role === 'doctor' ? user.id : '')}
              disabled={user?.role === 'doctor'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar profesional" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.firstName} {doctor.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.doctorId && (
              <p className="text-sm text-red-600 mt-1">Debe seleccionar un profesional</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Fecha</Label>
              <Input
                id="date"
                type="date"
                {...register('date', { required: 'La fecha es requerida' })}
              />
              {errors.date && (
                <p className="text-sm text-red-600 mt-1">{errors.date.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="time">Hora</Label>
              <Select onValueChange={(value) => setValue('time', value)} defaultValue={appointment?.time}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar hora" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.time && (
                <p className="text-sm text-red-600 mt-1">Debe seleccionar una hora</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Tipo de Cita</Label>
              <Select onValueChange={(value) => setValue('type', value)} defaultValue={appointment?.type || 'consultation'}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de cita" />
                </SelectTrigger>
                <SelectContent>
                  {appointmentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="duration">Duración (minutos)</Label>
              <Input
                id="duration"
                type="number"
                min="15"
                max="180"
                step="15"
                {...register('duration', { required: 'La duración es requerida' })}
              />
              {errors.duration && (
                <p className="text-sm text-red-600 mt-1">{errors.duration.message}</p>
              )}
            </div>
          </div>

          {appointment && (
            <div>
              <Label htmlFor="status">Estado</Label>
              <Select onValueChange={(value) => setValue('status', value)} defaultValue={appointment.status}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado de la cita" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">{t('Programada')}</SelectItem>
                  <SelectItem value="confirmed">{t('Confirmada')}</SelectItem>
                  <SelectItem value="completed">{t('Completada')}</SelectItem>
                  <SelectItem value="cancelled">{t('Cancelada')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Notas adicionales sobre la cita..."
              rows={3}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Guardando...' : (appointment ? 'Actualizar' : 'Crear')} Cita
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}