'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Hospital, Building, Stethoscope, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CURRENCIES } from '@/lib/format';
import { Separator } from '@/components/ui/separator';
import { useOrganizations } from '@/hooks/use-organizations';
import { OrganizationType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useLang } from '@/contexts/i18n-context';

const typeOptions: { value: OrganizationType; label: string; description: string; icon: typeof Hospital }[] = [
  {
    value: 'hospital',
    label: 'Hospital',
    description: 'Institución de salud de alta complejidad con múltiples servicios y especialidades.',
    icon: Hospital,
  },
  {
    value: 'clinic',
    label: 'Clínica',
    description: 'Centro médico con consultas, procedimientos y atención ambulatoria.',
    icon: Building,
  },
  {
    value: 'private_doctor',
    label: 'Doctor Privado',
    description: 'Profesional independiente que gestiona su propia consulta.',
    icon: Stethoscope,
  },
];

export default function NewOrganizationPage() {
  const { t } = useLang();
  const router = useRouter();
  const { addOrganization } = useOrganizations();

  const [name, setName] = useState('');
  const [type, setType] = useState<OrganizationType>('clinic');
  const [currency, setCurrency] = useState('USD');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !adminFirstName || !adminLastName || !adminEmail || !adminPassword) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    setSaving(true);
    try {
      await addOrganization({
        name,
        type,
        currency,
        isActive: true,
        adminFirstName,
        adminLastName,
        adminEmail,
        adminPassword,
      } as never);
      router.push('/organizations');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la organización');
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="min-h-[40px] min-w-[40px]">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('Nueva Organización')}</h1>
            <p className="text-gray-600 mt-1">
              Registra un hospital, clínica o doctor privado con su cuenta de administrador
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de organización */}
          <Card>
            <CardHeader>
              <CardTitle>{t('Tipo de organización')}</CardTitle>
              <CardDescription>Define el perfil y los módulos de esta organización.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {typeOptions.map((option) => {
                const Icon = option.icon;
                const selected = type === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setType(option.value)}
                    className={cn(
                      'flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors min-h-[44px]',
                      selected
                        ? 'border-rose-600 bg-rose-50 ring-1 ring-rose-600'
                        : 'border-gray-200 hover:border-rose-300 hover:bg-gray-50'
                    )}
                  >
                    <Icon className={cn('h-6 w-6', selected ? 'text-rose-600' : 'text-gray-400')} />
                    <span className={cn('font-medium text-sm', selected ? 'text-rose-700' : 'text-gray-900')}>
                      {option.label}
                    </span>
                    <span className="text-xs text-gray-500">{option.description}</span>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Datos de la organización */}
          <Card>
            <CardHeader>
              <CardTitle>{t('Datos de la organización')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="name">{t('Nombre')}</Label>
                <Input
                  id="name"
                  placeholder="Ej: Hospital General San Martín"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2 mt-4">
                <Label htmlFor="currency">{t('Moneda de facturación')}</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Todas las facturas de esta organización se muestran en esta moneda.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Cuenta del administrador */}
          <Card>
            <CardHeader>
              <CardTitle>{t('Administrador de la organización')}</CardTitle>
              <CardDescription>
                Este usuario podrá gestionar los miembros y datos de la organización.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adminFirstName">{t('Nombre')}</Label>
                  <Input
                    id="adminFirstName"
                    placeholder="Juan"
                    value={adminFirstName}
                    onChange={(e) => setAdminFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminLastName">{t('Apellido')}</Label>
                  <Input
                    id="adminLastName"
                    placeholder="Pérez"
                    value={adminLastName}
                    onChange={(e) => setAdminLastName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail">{t('Email')}</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="admin@hospital.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminPassword">{t('Contraseña')}</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  placeholder={t('Mínimo 6 caracteres')}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-4 py-3">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="flex items-center gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear Organización
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
