'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Camera, PenLine, User as UserIcon } from 'lucide-react';
import { SignaturePad } from '@/components/signature-pad';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/auth-context';
import { roleLabels } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { useLang } from '@/contexts/i18n-context';

/** Redimensiona un logo a PNG (mantiene transparencia, máx 400px) y devuelve un data URL. */
function fileToLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
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
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

/** Redimensiona la imagen a JPEG con fondo blanco (para firmas) y devuelve un data URL. */
function fileToSignature(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const w = 500;
        const h = 200;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        // ajustar manteniendo proporción, centrado
        const scale = Math.min(w / img.width, h / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

/** Redimensiona la imagen elegida a un cuadrado JPEG de 256px y devuelve un data URL. */
function fileToAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        // recorte centrado al cuadrado
        const min = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const { t } = useLang();
  const { user, updateUserState } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [signatureMode, setSignatureMode] = useState<'options' | 'draw'>('options');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetch('/api/auth/me', { credentials: 'same-origin' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d?.organizationLogo !== undefined && setOrgLogo(d.organizationLogo))
        .catch(() => {});
    }
  }, [user?.role, user?.id]);

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [avatar, setAvatar] = useState<string | null>(user?.avatar ?? null);
  const [signature, setSignature] = useState<string | null>(user?.signature ?? null);
  const [orgLogo, setOrgLogo] = useState<string | null>(user?.organizationLogo ?? null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Elige un archivo de imagen');
      return;
    }
    try {
      setAvatar(await fileToAvatar(file));
    } catch {
      toast.error('No se pudo procesar la imagen');
    }
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('El nombre y apellido son obligatorios');
      return;
    }
    if (newPassword && !currentPassword) {
      toast.error('Ingresa tu contraseña actual para cambiarla');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          avatar,
          signature,
          organizationLogo: orgLogo,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || 'Error al guardar');
      }
      updateUserState(body);
      setCurrentPassword('');
      setNewPassword('');
      toast.success(t('Perfil actualizado correctamente'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('Mi Perfil')}</h1>
        <p className="text-gray-600 mt-1">
          Configurá tus datos personales y tu foto de perfil
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            {/* Avatar con overlay de cámara */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative group rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2"
              aria-label="Cambiar foto de perfil"
            >
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt="Foto de perfil"
                  className="h-24 w-24 rounded-full object-cover ring-1 ring-black/10"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-rose-100 flex items-center justify-center">
                  <span className="text-2xl font-semibold text-rose-700">{initials}</span>
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-6 w-6 text-white" />
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="text-center sm:text-left">
              <p className="font-semibold text-gray-900">
                {firstName} {lastName}
              </p>
              <p className="text-sm text-gray-500">
                {user.email} · {roleLabels[user.role]}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 min-h-[36px]"
              >
                <Camera className="h-4 w-4 mr-2" />
                {avatar ? 'Cambiar foto' : 'Subir foto'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('Datos personales')}</CardTitle>
          <CardDescription>Tu nombre aparece en citas y recetas que emitís.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">{t('Nombre')}</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">{t('Apellido')}</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {user.role === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle>Logo de la organización</CardTitle>
            <CardDescription>Aparece en las facturas, recetas e historias clínicas impresas.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              {orgLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={orgLogo}
                  alt="Logo de la organización"
                  className="h-20 w-40 object-contain rounded-md border border-gray-200 bg-white"
                />
              ) : (
                <div className="h-20 w-40 rounded-md border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">
                  Sin logo cargado
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  className="min-h-[36px]"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {orgLogo ? 'Cambiar logo' : 'Subir logo'}
                </Button>
                {orgLogo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setOrgLogo(null)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 min-h-[36px]"
                  >
                    Quitar logo
                  </Button>
                )}
              </div>
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (!file.type.startsWith('image/')) {
                  toast.error('Elige un archivo de imagen');
                  return;
                }
                fileToLogo(file)
                  .then(setOrgLogo)
                  .catch(() => toast.error('No se pudo procesar la imagen'));
                e.target.value = '';
              }}
            />
          </CardContent>
        </Card>
      )}

      {user.role === 'doctor' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('Firma digital')}</CardTitle>
            <CardDescription>
              Se estampa en las recetas que emitís. Subí una imagen de tu firma sobre fondo claro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              {signature ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signature}
                  alt="Firma digital"
                  className="h-20 w-48 object-contain rounded-md border border-gray-200 bg-white"
                />
              ) : (
                <div className="h-20 w-48 rounded-md border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">
                  Sin firma cargada
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSignatureMode(signatureMode === 'draw' ? 'options' : 'draw')}
                  className="min-h-[36px]"
                >
                  <PenLine className="h-4 w-4 mr-2" />
                  {signatureMode === 'draw' ? 'Ver opciones' : 'Dibujar firma'}
                </Button>
                {signatureMode !== 'draw' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => signatureInputRef.current?.click()}
                    className="min-h-[36px]"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {signature ? 'Cambiar con imagen' : 'Subir imagen'}
                  </Button>
                )}
                {signature && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSignature(null)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 min-h-[36px]"
                  >
                    Quitar firma
                  </Button>
                )}
              </div>
            </div>

            {signatureMode === 'draw' && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <SignaturePad
                  onSave={(dataUrl) => {
                    setSignature(dataUrl);
                    setSignatureMode('options');
                    toast.success('Firma lista — no olvides guardar los cambios');
                  }}
                  onCancel={() => setSignatureMode('options')}
                />
              </div>
            )}
            <input
              ref={signatureInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (!file.type.startsWith('image/')) {
                  toast.error('Elige un archivo de imagen');
                  return;
                }
                fileToSignature(file)
                  .then(setSignature)
                  .catch(() => toast.error('No se pudo procesar la imagen'));
                e.target.value = '';
              }}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('Cambiar contraseña')}</CardTitle>
          <CardDescription>Deja los campos vacíos si no quieres cambiarla.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t('Contraseña actual')}</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t('Nueva contraseña')}</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder={t('Mínimo 6 caracteres')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2 min-h-[44px]">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}
