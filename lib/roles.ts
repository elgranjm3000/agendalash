import { UserRole } from './types';

export const roleLabels: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  doctor: 'Lash Artist',
  nurse: 'Asistente',
  receptionist: 'Recepcionista',
};
