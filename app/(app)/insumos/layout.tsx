'use client';

import { RoleGuard } from '@/components/role-guard';

export default function InsumosLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={['admin', 'super_admin']}>{children}</RoleGuard>;
}
