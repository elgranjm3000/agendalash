'use client';
import { useLang } from '@/contexts/i18n-context';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Patient } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PatientFormProps {
  patient?: Patient;
  onSubmit: (data: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export function PatientForm({ patient, onSubmit, onCancel }: PatientFormProps) {
  const { t } = useLang();
  const [loading, setLoading] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: patient ? {
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email,
      phone: patient.phone,
      dateOfBirth: patient.dateOfBirth,
      address: patient.address,
      emergencyContact: patient.emergencyContact,
      emergencyPhone: patient.emergencyPhone,
      medicalHistory: patient.medicalHistory || '',
    } : {}
  });

  const handleFormSubmit = async (data: any) => {
    setLoading(true);
    try {
      await onSubmit(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {patient ? 'Editar Clienta' : 'Nueva Clienta'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">{t('Nombre')}</Label>
              <Input
                id="firstName"
                {...register('firstName', { required: 'El nombre es requerido' })}
                placeholder="Nombre de la clienta"
              />
              {errors.firstName && (
                <p className="text-sm text-red-600 mt-1">{errors.firstName.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="lastName">{t('Apellido')}</Label>
              <Input
                id="lastName"
                {...register('lastName', { required: 'El apellido es requerido' })}
                placeholder="Apellido de la clienta"
              />
              {errors.lastName && (
                <p className="text-sm text-red-600 mt-1">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">{t('Email')}</Label>
              <Input
                id="email"
                type="email"
                {...register('email', { 
                  required: 'El email es requerido',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Email inválido'
                  }
                })}
                placeholder="correo@ejemplo.com"
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                {...register('phone', { required: 'El teléfono es requerido' })}
                placeholder="+1 (555) 123-4567"
              />
              {errors.phone && (
                <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="dateOfBirth">Fecha de Nacimiento</Label>
            <Input
              id="dateOfBirth"
              type="date"
              {...register('dateOfBirth', { required: 'La fecha de nacimiento es requerida' })}
            />
            {errors.dateOfBirth && (
              <p className="text-sm text-red-600 mt-1">{errors.dateOfBirth.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              {...register('address', { required: 'La dirección es requerida' })}
              placeholder="Dirección completa de la clienta"
            />
            {errors.address && (
              <p className="text-sm text-red-600 mt-1">{errors.address.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="emergencyContact">Contacto de Emergencia</Label>
              <Input
                id="emergencyContact"
                {...register('emergencyContact', { required: 'El contacto de emergencia es requerido' })}
                placeholder="Nombre del contacto"
              />
              {errors.emergencyContact && (
                <p className="text-sm text-red-600 mt-1">{errors.emergencyContact.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="emergencyPhone">Teléfono de Emergencia</Label>
              <Input
                id="emergencyPhone"
                {...register('emergencyPhone', { required: 'El teléfono de emergencia es requerido' })}
                placeholder="+1 (555) 123-4567"
              />
              {errors.emergencyPhone && (
                <p className="text-sm text-red-600 mt-1">{errors.emergencyPhone.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="medicalHistory">Notas relevantes (Opcional)</Label>
            <Textarea
              id="medicalHistory"
              {...register('medicalHistory')}
              placeholder="Alergias y notas relevantes de la clienta..."
              rows={4}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Guardando...' : (patient ? 'Actualizar' : 'Crear')} Clienta
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