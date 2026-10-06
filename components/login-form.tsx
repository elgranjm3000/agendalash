'use client';
import Link from 'next/link';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Stethoscope, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useLang } from '@/contexts/i18n-context';

interface LoginFormData {
  email: string;
  password: string;
}

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const { lang, setLang, t } = useLang();
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError('');
    
    try {
      const success = await login(data.email, data.password);
      if (!success) {
        setError(t('login.invalid'));
      }
    } catch (err) {
      setError('Error al iniciar sesión. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md relative">
        <div className="absolute top-4 right-4 flex items-center rounded-md border border-gray-200 overflow-hidden bg-white">
          {(['es', 'en'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`px-2.5 py-1 text-xs font-semibold uppercase transition-colors ${
                lang === l ? 'bg-rose-600 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-rose-100 rounded-full">
              <Stethoscope className="h-8 w-8 text-rose-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">AgendaLash</CardTitle>
          <p className="text-gray-600">{t('login.subtitle')}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">{t('login.email')}</Label>
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
                placeholder="tu@email.com"
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="password">{t('login.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', { required: 'La contraseña es requerida' })}
                  placeholder="Tu contraseña"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (lang === 'es' ? 'Iniciando sesión...' : 'Signing in...') : t('login.submit')}
            </Button>

            <div className="text-center text-sm">
              <span className="text-gray-600">
                {lang === 'es' ? '¿No tenés cuenta? ' : "Don't have an account? "}
              </span>
              <Link href="/registrarse" className="font-semibold text-rose-700 hover:text-rose-800">
                {lang === 'es' ? 'Prueba gratis 7 días' : 'Try free for 7 days'}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}