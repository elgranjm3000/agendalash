'use client';

import { RoleGuard } from '@/components/role-guard';

export default function RecetasLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={['admin', 'nurse', 'super_admin']}>{children}</RoleGuard>;
}
