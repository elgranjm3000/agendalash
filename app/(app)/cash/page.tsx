'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Trash2,
  Scale,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCashEntries } from '@/hooks/use-cash-entries';
import { useOrgSettings } from '@/hooks/use-org-settings';
import { useAuth } from '@/contexts/auth-context';
import { formatMoney } from '@/lib/format';
import { CashEntry, CashMethod, CashType } from '@/lib/types';
import { cn } from '@/lib/utils';

const methodLabels: Record<CashMethod, string> = {
  efectivo: 'Efectivo',
  punto: 'Punto de venta',
  transferencia: 'Transferencia',
  otro: 'Otro',
};

const todayStr = () => new Date().toISOString().split('T')[0];

export default function CashPage() {
  const { user } = useAuth();
  const { currency } = useOrgSettings();
  const { entries, loading, addEntry, deleteEntry } = useCashEntries();

  const [date, setDate] = useState(todayStr());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [type, setType] = useState<CashType>('ingreso');
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<CashMethod>('efectivo');
  const [saving, setSaving] = useState(false);

  const dayEntries = useMemo(
    () => entries
      .filter((e) => e.date === date)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [entries, date]
  );

  const totals = useMemo(() => {
    const ingresos = dayEntries.filter((e) => e.type === 'ingreso').reduce((s, e) => s + Number(e.amount), 0);
    const egresos = dayEntries.filter((e) => e.type === 'egreso').reduce((s, e) => s + Number(e.amount), 0);
    const byMethod = {} as Record<CashMethod, number>;
    for (const e of dayEntries) {
      const delta = e.type === 'ingreso' ? Number(e.amount) : -Number(e.amount);
      byMethod[e.method] = (byMethod[e.method] ?? 0) + delta;
    }
    return { ingresos, egresos, neto: ingresos - egresos, byMethod };
  }, [dayEntries]);

  const openDialog = (t: CashType) => {
    setType(t);
    setConcept('');
    setAmount('');
    setMethod('efectivo');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const value = Number(amount);
    if (!concept.trim() || !value || value <= 0) {
      toast.error('Concepto y monto válido son obligatorios');
      return;
    }
    setSaving(true);
    try {
      await addEntry({
        type,
        concept: concept.trim(),
        amount: value,
        method,
        date,
        registeredBy: user ? `${user.firstName} ${user.lastName}` : null,
      });
      toast.success(type === 'ingreso' ? 'Ingreso registrado' : 'Egreso registrado');
      setDialogOpen(false);
    } catch {
      toast.error('No se pudo registrar el movimiento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry: CashEntry) => {
    if (confirm(`¿Eliminar el movimiento "${entry.concept}"?`)) {
      try {
        await deleteEntry(entry.id);
        toast.success('Movimiento eliminado');
      } catch {
        toast.error('No se pudo eliminar');
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="h-8 w-8 text-rose-600" />
            Caja
          </h1>
          <p className="text-gray-600 mt-1">Movimientos de efectivo y arqueo diario</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => openDialog('egreso')} className="flex items-center gap-2 min-h-[44px]">
            <ArrowUpCircle className="h-4 w-4 text-red-600" />
            Egreso
          </Button>
          <Button onClick={() => openDialog('ingreso')} className="flex items-center gap-2 min-h-[44px]">
            <ArrowDownCircle className="h-4 w-4" />
            Ingreso
          </Button>
        </div>
      </div>

      {/* Selector de fecha */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="space-y-1">
            <Label htmlFor="date">Día de caja</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
          </div>
          <p className="text-sm text-gray-500">
            {format(new Date(date + 'T12:00:00'), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </CardContent>
      </Card>

      {/* Resumen del día */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium text-gray-600">Ingresos del día</p>
            <p className="text-2xl font-bold text-emerald-700 tabular-nums">{formatMoney(totals.ingresos, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium text-gray-600">Egresos del día</p>
            <p className="text-2xl font-bold text-red-700 tabular-nums">{formatMoney(totals.egresos, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium text-gray-600 flex items-center gap-1.5">
              <Scale className="h-4 w-4 text-rose-600" />
              Neto en caja
            </p>
            <p className="text-2xl font-bold text-rose-700 tabular-nums">{formatMoney(totals.neto, currency)}</p>
            <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-500">
              {Object.entries(totals.byMethod).map(([m, v]) => (
                <span key={m}>{methodLabels[m as CashMethod]}: <span className="tabular-nums font-medium">{formatMoney(v, currency)}</span></span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movimientos */}
      <Card>
        <CardContent className="p-0">
          {dayEntries.length === 0 ? (
            <div className="p-12 text-center">
              <Wallet className="h-14 w-14 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600">Sin movimientos en este día.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left">
                    <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Concepto</th>
                    <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Tipo</th>
                    <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Método</th>
                    <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Registró</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Monto</th>
                    <th className="py-3 px-4 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {dayEntries.map((e) => (
                    <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2.5 px-4 font-medium text-gray-900">{e.concept}</td>
                      <td className="py-2.5 px-4">
                        <Badge
                          className={cn(
                            e.type === 'ingreso'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          )}
                        >
                          {e.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-gray-600">{methodLabels[e.method]}</td>
                      <td className="py-2.5 px-4 text-gray-500 text-xs">{e.registeredBy ?? '—'}</td>
                      <td className={cn(
                        'py-2.5 px-4 text-right font-semibold tabular-nums',
                        e.type === 'ingreso' ? 'text-emerald-700' : 'text-red-700'
                      )}>
                        {e.type === 'ingreso' ? '+' : '−'}{formatMoney(e.amount, currency)}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(e)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogo de movimiento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {type === 'ingreso'
                ? <ArrowDownCircle className="h-5 w-5 text-emerald-600" />
                : <ArrowUpCircle className="h-5 w-5 text-red-600" />}
              Registrar {type}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="concept">Concepto</Label>
              <Input
                id="concept"
                placeholder={type === 'ingreso' ? 'Ej: Cobro consulta Dr. Pérez' : 'Ej: Compra de insumos'}
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Monto</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Método</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as CashMethod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(methodLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                Registrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
