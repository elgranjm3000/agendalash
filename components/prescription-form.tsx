'use client';
import { useLang } from '@/contexts/i18n-context';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Prescription, Medication } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PatientCombobox } from '@/components/patient-combobox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { usePatients } from '@/hooks/use-patients';
import { useUsers } from '@/hooks/use-users';
import { useAuth } from '@/contexts/auth-context';

interface PrescriptionFormProps {
  prescription?: Prescription;
  onSubmit: (data: Omit<Prescription, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  /** Preselección desde la Ficha de clienta */
  initialPatientId?: string;
  recordId?: string | null;
}

export function PrescriptionForm({ prescription, onSubmit, onCancel, initialPatientId, recordId }: PrescriptionFormProps) {
  const { t } = useLang();
  const [loading, setLoading] = useState(false);
  const { patients } = usePatients();
  const { getDoctors } = useUsers();
  const { user } = useAuth();
  const doctors = getDoctors();
  
  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm({
    defaultValues: prescription ? {
      patientId: prescription.patientId,
      doctorId: prescription.doctorId,
      diagnosis: prescription.diagnosis,
      instructions: prescription.instructions,
      status: prescription.status,
      medications: prescription.medications,
    } : {
      doctorId: user?.role === 'doctor' ? user.id : '',
      status: 'active',
      medications: [{ id: crypto.randomUUID(), name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
    }
  });

  useEffect(() => {
    if (initialPatientId && !prescription) {
      setValue('patientId', initialPatientId);
    }
  }, [initialPatientId, prescription, setValue]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'medications'
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
        recordId: recordId ?? null,
        patientName,
        doctorName,
      });
    } finally {
      setLoading(false);
    }
  };

  const addMedication = () => {
    append({ id: crypto.randomUUID(), name: '', dosage: '', frequency: '', duration: '', instructions: '' });
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          {prescription ? 'Editar Indicación' : 'Nueva Indicación'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                defaultValue={prescription?.doctorId || (user?.role === 'doctor' ? user.id : '')}
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
          </div>

          <div>
            <Label htmlFor="diagnosis">{t('Nota técnica')}</Label>
            <Input
              id="diagnosis"
              {...register('diagnosis', { required: 'La nota técnica es requerida' })}
              placeholder="Diagnóstico / nota técnica"
            />
            {errors.diagnosis && (
              <p className="text-sm text-red-600 mt-1">{errors.diagnosis.message}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <Label>Productos</Label>
              <Button type="button" onClick={addMedication} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Producto
              </Button>
            </div>
            
            <div className="space-y-4">
              {fields.map((field, index) => (
                <Card key={field.id} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Producto {index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => remove(index)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`medications.${index}.name`}>Nombre del producto</Label>
                      <Input
                        {...register(`medications.${index}.name`, { required: 'El nombre es requerido' })}
                        placeholder="Nombre del producto"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`medications.${index}.dosage`}>{t('Dosis')}</Label>
                      <Input
                        {...register(`medications.${index}.dosage`, { required: 'La dosis es requerida' })}
                        placeholder="ej: 500mg"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`medications.${index}.frequency`}>{t('Frecuencia')}</Label>
                      <Input
                        {...register(`medications.${index}.frequency`, { required: 'La frecuencia es requerida' })}
                        placeholder="ej: Cada 8 horas"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`medications.${index}.duration`}>{t('Duración')}</Label>
                      <Input
                        {...register(`medications.${index}.duration`, { required: 'La duración es requerida' })}
                        placeholder="ej: 7 días"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Label htmlFor={`medications.${index}.instructions`}>Instrucciones Especiales</Label>
                    <Textarea
                      {...register(`medications.${index}.instructions`)}
                      placeholder="Instrucciones adicionales para este producto..."
                      rows={2}
                    />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="instructions">Instrucciones Generales</Label>
            <Textarea
              id="instructions"
              {...register('instructions', { required: 'Las instrucciones son requeridas' })}
              placeholder="Instrucciones generales para la clienta..."
              rows={4}
            />
            {errors.instructions && (
              <p className="text-sm text-red-600 mt-1">{errors.instructions.message}</p>
            )}
          </div>

          {prescription && (
            <div>
              <Label htmlFor="status">Estado</Label>
              <Select onValueChange={(value) => setValue('status', value)} defaultValue={prescription.status}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado de la indicación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('Activa')}</SelectItem>
                  <SelectItem value="completed">{t('Completada')}</SelectItem>
                  <SelectItem value="cancelled">{t('Cancelada')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Guardando...' : (prescription ? 'Actualizar' : 'Crear')} Indicación
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