'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Hospital, Building, Stethoscope, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrganizations } from '@/hooks/use-organizations';
import { CURRENCIES } from '@/lib/format';
import { OrganizationType } from '@/lib/types';
import { cn } from '@/lib/utils';

const typeOptions: { value: OrganizationType; label: string; icon: typeof Hospital }[] = [
  { value: 'hospital', label: 'Red de estudios', icon: Hospital },
  { value: 'clinic', label: 'Estudio', icon: Building },
  { value: 'private_doctor', label: 'Profesional independiente', icon: Stethoscope },
];

export default function EditOrganizationPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { organizations, loading, updateOrganization } = useOrganizations();

  const org = organizations.find((o) => o.id === params.id);

  const [name, setName] = useState('');
  const [type, setType] = useState<OrganizationType>('clinic');
  const [currency, setCurrency] = useState('USD');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (org) {
      setName(org.name);
      setType(org.type);
      setCurrency(org.currency ?? 'USD');
    }
  }, [org]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    try {
      await updateOrganization(params.id, { name: name.trim(), type, currency });
      toast.success('Organización actualizada correctamente');
      router.push('/organizations');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Organización no encontrada</h1>
        <p className="text-gray-600">Puede que haya sido eliminada.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="min-h-[40px] min-w-[40px]">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Editar Organización</h1>
            <p className="text-gray-600 mt-1">Modifica los datos de {org.name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tipo de organización</CardTitle>
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
                      'flex items-center gap-2 rounded-lg border p-4 text-left transition-colors min-h-[44px]',
                      selected
                        ? 'border-rose-600 bg-rose-50 ring-1 ring-rose-600'
                        : 'border-gray-200 hover:border-rose-300 hover:bg-gray-50'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', selected ? 'text-rose-600' : 'text-gray-400')} />
                    <span className={cn('font-medium text-sm', selected ? 'text-rose-700' : 'text-gray-900')}>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Datos de la organización</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Moneda de facturación</Label>
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
                  Cambiar la moneda afecta cómo se muestran las facturas nuevas y existentes (los montos no se convierten).
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="flex items-center gap-2 min-h-[44px]">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar cambios
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
