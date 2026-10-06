'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Hospital, Building, Stethoscope, Loader2, CheckCircle2, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CURRENCIES } from '@/lib/format';
import { Camera, Image as ImageIcon } from 'lucide-react';
import { OrganizationType } from '@/lib/types';
import { cn } from '@/lib/utils';

const typeOptions: { value: OrganizationType; label: string; description: string; icon: typeof Hospital }[] = [
  {
    value: 'clinic',
    label: 'Estudio de pestañas',
    description: 'Salón o estudio dedicado a lifting y extensiones de pestañas.',
    icon: Building,
  },
  {
    value: 'hospital',
    label: 'Red de estudios',
    description: 'Varios salones o sucursales bajo una misma marca.',
    icon: Hospital,
  },
  {
    value: 'private_doctor',
    label: 'Lash Artist independiente',
    description: 'Profesional que trabaja por cuenta propia.',
    icon: Stethoscope,
  },
];

export default function RegisterPage() {
  const router = useRouter();

  const [orgName, setOrgName] = useState('');
  const [type, setType] = useState<OrganizationType>('clinic');
  const [currency, setCurrency] = useState('USD');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!orgName || !adminFirstName || !adminLastName || !adminEmail || !adminPassword) {
      setError('Todos los campos son obligatorios.');
      return;
    }
    if (adminPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgName, type, currency, logo,
          adminFirstName, adminLastName, adminEmail, adminPassword,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Error al registrar');

      // El registro ya dejó la cookie de sesión httpOnly: entrar directo
      localStorage.setItem(
        'medical_current_user',
        JSON.stringify({
          id: '', email: adminEmail, firstName: adminFirstName, lastName: adminLastName,
          role: 'admin', organizationName: orgName, trialEndsAt: body.trialEndsAt, isActive: true,
        })
      );
      window.location.href = '/';
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="min-h-[40px] min-w-[40px]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Crear cuenta</h1>
            <p className="text-gray-600 mt-1 flex items-center gap-2">
              <Gift className="h-4 w-4 text-rose-600" />
              Prueba AgendaLash gratis durante 7 días, sin tarjeta
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tu organización</CardTitle>
              <CardDescription>Será el espacio privado donde gestionarás tus clientas y servicios.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                      <Icon className={cn('h-5 w-5', selected ? 'text-rose-600' : 'text-gray-400')} />
                      <span className={cn('font-medium text-sm', selected ? 'text-rose-700' : 'text-gray-900')}>
                        {option.label}
                      </span>
                      <span className="text-xs text-gray-500">{option.description}</span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgName">Nombre de la organización</Label>
                <Input
                  id="orgName"
                  placeholder="Ej: Clínica Santa María"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Logo (opcional)</Label>
                <div className="flex items-center gap-3">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt="Logo" className="h-14 w-28 object-contain rounded-md border border-gray-200 bg-white" />
                  ) : (
                    <div className="h-14 w-28 rounded-md border border-dashed border-gray-300 flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-gray-300" />
                    </div>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} className="min-h-[36px]">
                    <Camera className="h-4 w-4 mr-2" />
                    {logo ? 'Cambiar' : 'Subir logo'}
                  </Button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        const img = new Image();
                        img.onload = () => {
                          const max = 400;
                          const scale = Math.min(1, max / Math.max(img.width, img.height));
                          const canvas = document.createElement('canvas');
                          canvas.width = Math.round(img.width * scale);
                          canvas.height = Math.round(img.height * scale);
                          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
                          setLogo(canvas.toDataURL('image/png'));
                        };
                        img.src = reader.result as string;
                      };
                      reader.readAsDataURL(file);
                      e.target.value = '';
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500">Se verá en sus facturas y recetas impresas.</p>
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tu cuenta de administrador</CardTitle>
              <CardDescription>
                Como administrador podrás invitar doctores, enfermeras y recepcionistas a tu organización.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adminFirstName">Nombre</Label>
                  <Input id="adminFirstName" value={adminFirstName} onChange={(e) => setAdminFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminLastName">Apellido</Label>
                  <Input id="adminLastName" value={adminLastName} onChange={(e) => setAdminLastName(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="admin@tuclinica.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminPassword">Contraseña</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-4 py-3">{error}</p>
          )}

          <div className="flex items-center justify-end gap-3">
            <Link href="/">
              <Button type="button" variant="outline" disabled={saving}>Cancelar</Button>
            </Link>
            <Button type="submit" disabled={saving} className="flex items-center gap-2 min-h-[44px]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Crear cuenta y empezar prueba
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
