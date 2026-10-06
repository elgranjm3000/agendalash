'use client';
import { useLang } from '@/contexts/i18n-context';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

interface UserFormProps {
  user?: User;
  onSubmit: (data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export function UserForm({ user, onSubmit, onCancel }: UserFormProps) {
  const { t } = useLang();
  const [loading, setLoading] = useState(false);
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: user ? {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '', // Don't pre-fill password for security
      role: user.role,
      isActive: user.isActive,
    } : {
      role: 'receptionist',
      isActive: true,
    }
  });

  const isActive = watch('isActive');

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
          {user ? 'Editar Usuario' : 'Nuevo Usuario'}
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
                placeholder="Nombre del usuario"
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
                placeholder="Apellido del usuario"
              />
              {errors.lastName && (
                <p className="text-sm text-red-600 mt-1">{errors.lastName.message}</p>
              )}
            </div>
          </div>

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
            <Label htmlFor="password">
              {user ? 'Nueva Contraseña (dejar vacío para mantener actual)' : 'Contraseña'}
            </Label>
            <Input
              id="password"
              type="password"
              {...register('password', user ? {} : { required: 'La contraseña es requerida' })}
              placeholder="Contraseña del usuario"
            />
            {errors.password && (
              <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="role">Rol</Label>
            <Select onValueChange={(value) => setValue('role', value)} defaultValue={user?.role || 'receptionist'}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="doctor">Lash Artist</SelectItem>
                <SelectItem value="nurse">Asistente</SelectItem>
                <SelectItem value="receptionist">Recepcionista</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-red-600 mt-1">Debe seleccionar un rol</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setValue('isActive', checked)}
            />
            <Label htmlFor="isActive">Usuario activo</Label>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Guardando...' : (user ? 'Actualizar' : 'Crear')} Usuario
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