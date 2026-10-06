'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ShieldCheck, Search, LogIn, LogOut, Eye, Plus, Pencil, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/auth-context';

interface AuditRow {
  id: string;
  ts: string;
  userEmail: string | null;
  userName: string | null;
  organizationId: string | null;
  action: string;
  entity: string | null;
  detail: string | null;
  ip: string | null;
}

const actionConfig: Record<string, { label: string; icon: typeof LogIn; badge: string }> = {
  login: { label: 'Inició sesión', icon: LogIn, badge: 'bg-emerald-100 text-emerald-800' },
  login_failed: { label: 'Login fallido', icon: LogOut, badge: 'bg-red-100 text-red-800' },
  register: { label: 'Se registró', icon: UserPlus, badge: 'bg-rose-100 text-rose-800' },
  view: { label: 'Consultó', icon: Eye, badge: 'bg-gray-100 text-gray-700' },
  create: { label: 'Creó', icon: Plus, badge: 'bg-blue-100 text-blue-800' },
  update: { label: 'Modificó', icon: Pencil, badge: 'bg-amber-100 text-amber-800' },
  delete: { label: 'Eliminó', icon: Trash2, badge: 'bg-red-100 text-red-800' },
};

const entityLabels: Record<string, string> = {
  users: 'Usuarios',
  patients: 'Pacientes',
  appointments: 'Citas',
  prescriptions: 'Prescripciones',
  invoices: 'Facturas',
  organizations: 'Organizaciones',
};

export default function AuditPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const load = (action: string) => {
    setLoading(true);
    const qs = action !== 'all' ? `?action=${action}` : '';
    fetch(`/api/audit-log${qs}`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load('all');
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.userEmail?.toLowerCase().includes(q) ||
        r.userName?.toLowerCase().includes(q) ||
        r.detail?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="h-8 w-8 text-rose-600" />
          Auditoría
        </h1>
        <p className="text-gray-600 mt-1">
          Registro completo de sesiones y operaciones — última actividad primero
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por usuario o detalle..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={actionFilter}
              onValueChange={(v) => {
                setActionFilter(v);
                load(v);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las acciones</SelectItem>
                {Object.entries(actionConfig).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center text-sm text-gray-500">
              {loading ? 'Cargando…' : `${filtered.length} registros`}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Fecha / Hora</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Usuario</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Acción</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Módulo</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Detalle</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">IP</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const cfg = actionConfig[row.action] ?? {
                    label: row.action,
                    icon: Eye,
                    badge: 'bg-gray-100 text-gray-700',
                  };
                  return (
                    <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2.5 px-4 whitespace-nowrap tabular-nums text-gray-600">
                        {format(new Date(row.ts), 'd MMM yyyy, HH:mm:ss', { locale: es })}
                      </td>
                      <td className="py-2.5 px-4">
                        <p className="font-medium text-gray-900">{row.userName ?? '—'}</p>
                        <p className="text-xs text-gray-500">{row.userEmail}</p>
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge className={cfg.badge}>{cfg.label}</Badge>
                      </td>
                      <td className="py-2.5 px-4 text-gray-600">
                        {row.entity ? entityLabels[row.entity] ?? row.entity : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-gray-600 max-w-xs">
                        <span className="truncate block">{row.detail ?? '—'}</span>
                      </td>
                      <td className="py-2.5 px-4 text-gray-400 tabular-nums">{row.ip ?? '—'}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      Sin registros para este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
