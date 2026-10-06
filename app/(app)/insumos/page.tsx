'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useLang } from '@/contexts/i18n-context';
import { useCoverage } from '@/hooks/use-coverage';
import { useLashProducts } from '@/hooks/use-lash-products';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Package, AlertTriangle, Plus, Pencil, Trash2, Warehouse } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CoverageRow, LashProduct } from '@/lib/types';

/** Medidor de cobertura: la barra representa los días restantes vs el umbral. */
function CoverageMeter({ row }: { row: CoverageRow }) {
  const { t } = useLang();
  const pct = row.coverageDays === null ? 100 : Math.min(100, (row.coverageDays / row.thresholdDays) * 100);
  const barColor =
    row.level === 'critical' ? 'bg-rose-500' : row.level === 'warn' ? 'bg-amber-500' : 'bg-primary';
  return (
    <div className="space-y-1.5">
      <Progress value={pct} className="h-2" indicatorClassName={barColor} />
      <p className="text-xs text-muted-foreground">
        {row.coverageDays === null ? (
          t('supplies.noUsage')
        ) : (
          <>
            <span className="font-medium text-foreground tabular-nums">
              {t('supplies.sessionsCovered', { n: Math.floor(row.sessionsCovered) })}
            </span>
            {' · '}
            {t('supplies.daysLeft', { n: Math.max(0, Math.ceil(row.coverageDays)) })}
          </>
        )}
      </p>
    </div>
  );
}

function ProductForm({
  product,
  onSubmit,
  onCancel,
}: {
  product?: LashProduct;
  onSubmit: (data: Omit<LashProduct, 'id' | 'createdAt' | 'updatedAt'>) => Promise<unknown>;
  onCancel: () => void;
}) {
  const { t } = useLang();
  const [form, setForm] = useState({
    sku: product?.sku ?? '',
    name: product?.name ?? '',
    unit: product?.unit ?? 'ml',
    stock: product?.stock ?? 0,
    minStock: product?.minStock ?? 0,
    cost: product?.cost ?? 0,
    supplier: product?.supplier ?? '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.sku.trim() || !form.name.trim()) {
      toast.error(t('supplies.requiredFields'));
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ ...form, sku: form.sku.trim(), name: form.name.trim() });
      toast.success(product ? t('supplies.updated') : t('supplies.created'));
      onCancel();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="sku">SKU</Label>
        <Input id="sku" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="LFT-PERM-100" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">{t('supplies.name')}</Label>
        <Input id="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="unit">{t('supplies.unit')}</Label>
        <select
          id="unit"
          value={form.unit}
          onChange={e => setForm({ ...form, unit: e.target.value })}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="ml">ml</option>
          <option value="unidades">{t('supplies.units')}</option>
          <option value="gr">gr</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="stock">{t('supplies.stock')}</Label>
        <Input id="stock" type="number" min="0" step="0.1" value={form.stock} onChange={e => setForm({ ...form, stock: Number(e.target.value) })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="minStock">{t('supplies.minStock')}</Label>
        <Input id="minStock" type="number" min="0" step="0.1" value={form.minStock} onChange={e => setForm({ ...form, minStock: Number(e.target.value) })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="supplier">{t('supplies.supplier')}</Label>
        <Input id="supplier" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} />
      </div>
      <div className="sm:col-span-2 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>{t('common.cancel')}</Button>
        <Button onClick={submit} disabled={saving}>{t('common.save')}</Button>
      </div>
    </div>
  );
}

export default function InsumosPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const { items, loading } = useCoverage();
  const { products, addProduct, updateProduct, deleteProduct } = useLashProducts();
  const [editing, setEditing] = useState<LashProduct | undefined>();
  const [creating, setCreating] = useState(false);

  const isSupplier = user?.role === 'super_admin';
  const alerts = items.filter(i => i.coverageDays !== null && i.coverageDays <= i.thresholdDays);

  const removeProduct = async (p: LashProduct) => {
    if (!confirm(t('supplies.confirmDelete', { sku: p.sku }))) return;
    try {
      await deleteProduct(p.id);
      toast.success(t('supplies.deleted'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('supplies.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('supplies.subtitle')}</p>
        </div>
        {isSupplier && (
          <Dialog open={creating} onOpenChange={setCreating}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />{t('supplies.new')}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>{t('supplies.new')}</DialogTitle>
              </DialogHeader>
              <ProductForm onSubmit={addProduct} onCancel={() => setCreating(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Alertas de cobertura del salón */}
      {alerts.length > 0 && (
        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-rose-900">
                {t('supplies.alertTitle', { n: alerts.length })}
              </p>
              <p className="text-rose-700">
                {alerts.map(a => `${a.name} (${Math.ceil(a.coverageDays as number)} ${t('supplies.daysShort')})`).join(' · ')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cobertura del stock del salón, por insumo con receta */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('supplies.salonCoverage')}
        </h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : items.filter(i => i.coverageDays !== null).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <Package className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t('supplies.noCoverage')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.filter(i => i.coverageDays !== null).map(row => (
              <Card key={row.itemId} className={cn(
                row.level === 'critical' && 'border-rose-200',
                row.level === 'warn' && 'border-amber-200'
              )}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base font-semibold">
                    <span className="truncate">{row.name}</span>
                    {row.sku && <span className="text-xs font-normal text-muted-foreground">{row.sku}</span>}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {t('supplies.stock')} {row.stock} {row.unit} · {t('supplies.weeklyUsage')} {row.weeklyUsage.toFixed(1)}
                  </p>
                </CardHeader>
                <CardContent>
                  <CoverageMeter row={row} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Catálogo del proveedor con stock en depósito */}
      {isSupplier && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Warehouse className="h-4 w-4" />
            {t('supplies.catalog')}
          </h2>
          {products.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                {t('supplies.noProducts')}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">{t('supplies.name')}</th>
                      <th className="px-4 py-3 text-right">{t('supplies.stock')}</th>
                      <th className="px-4 py-3 text-right">{t('supplies.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                        <tr key={p.id} className="border-b last:border-0">
                          <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                          <td className="px-4 py-3">{p.name}</td>
                          <td className={cn('px-4 py-3 text-right tabular-nums', p.stock <= p.minStock && 'text-rose-600 font-medium')}>
                            {p.stock} {p.unit}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <Dialog open={editing?.id === p.id} onOpenChange={open => !open && setEditing(undefined)}>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(p)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-xl">
                                  <DialogHeader>
                                    <DialogTitle>{p.sku}</DialogTitle>
                                  </DialogHeader>
                                  <ProductForm
                                    product={p}
                                    onSubmit={data => updateProduct(p.id, data)}
                                    onCancel={() => setEditing(undefined)}
                                  />
                                </DialogContent>
                              </Dialog>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeProduct(p)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </section>
      )}
    </div>
  );
}
