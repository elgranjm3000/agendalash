'use client';

import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { UserForm } from '@/components/user-form';
import { useUsers } from '@/hooks/use-users';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { users, loading, updateUser } = useUsers();

  const user = users.find(u => u.id === params.id);

  const handleSubmit = async (userData: any) => {
    try {
      await updateUser(params.id, userData);
      toast.success('Usuario actualizado correctamente');
      router.push('/users');
    } catch {
      toast.error('No se pudo guardar. Intentá de nuevo.');
    }
  };

  const handleCancel = () => {
    router.push('/users');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Usuario no encontrado</h1>
        <p className="text-gray-600">Puede que haya sido eliminado.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Editar Usuario</h1>
        <p className="text-gray-600 mt-1">Modifica los datos del usuario</p>
      </div>

      <UserForm
        user={user}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
}
