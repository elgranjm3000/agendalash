'use client';

import { useLang } from '@/contexts/i18n-context';
import { useCoverage } from '@/hooks/use-coverage';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle2, Warehouse } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AlertasPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const { items, supplier, loading } = useCoverage();

  const low = items.filter(i => i.coverageDays !== null && i.coverageDays <= i.thresholdDays);
  const fine = items.filter(i => i.coverageDays === null || i.coverageDays > i.thresholdDays);
  const lowSupplier = (supplier ?? []).filter(
    p => p.coverageDays !== null && p.coverageDays <= 7
  );

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('alerts.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('alerts.subtitle')}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <>
          {low.length === 0 ? (
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardContent className="flex items-center gap-3 py-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <p className="text-sm font-medium text-emerald-900">{t('alerts.allGood')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {low.map(row => {
                const pct = Math.min(100, ((row.coverageDays as number) / row.thresholdDays) * 100);
                return (
                  <Card key={row.itemId} className={cn(row.level === 'critical' ? 'border-rose-200' : 'border-amber-200')}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <AlertTriangle className={cn('h-4 w-4 shrink-0', row.level === 'critical' ? 'text-rose-600' : 'text-amber-600')} />
                        <span className="truncate">{row.name}</span>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {row.sku ? `SKU ${row.sku} · ` : ''}{t('supplies.stock')} {row.stock} {row.unit}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                      <Progress
                        value={pct}
                        className="h-2"
                        indicatorClassName={row.level === 'critical' ? 'bg-rose-500' : 'bg-amber-500'}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('supplies.daysLeft', { n: Math.max(0, Math.ceil(row.coverageDays as number)) })}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {fine.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t('alerts.okSection')}
              </h2>
              <div className="flex flex-wrap gap-2">
                {fine.map(row => (
                  <span key={row.itemId} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    {row.name}
                    {row.coverageDays !== null && (
                      <span className="text-muted-foreground tabular-nums">
                        · {Math.ceil(row.coverageDays)} {t('supplies.daysShort')}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Rollup del depósito del proveedor (solo super_admin) */}
          {user?.role === 'super_admin' && lowSupplier.length > 0 && (
            <section className="space-y-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Warehouse className="h-4 w-4" />
                {t('alerts.supplierSection')}
              </h2>
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3">SKU</th>
                        <th className="px-4 py-3">{t('supplies.name')}</th>
                        <th className="px-4 py-3 text-right">{t('supplies.stock')}</th>
                        <th className="px-4 py-3 text-right">{t('alerts.networkUsage')}</th>
                        <th className="px-4 py-3 text-right">{t('alerts.coverage')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowSupplier.map(p => (
                        <tr key={p.productId} className="border-b last:border-0">
                          <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                          <td className="px-4 py-3">{p.name}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{p.stock} {p.unit}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{p.networkWeeklyUsage.toFixed(1)}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-medium text-rose-600">
                            {Math.ceil(p.coverageDays as number)} {t('supplies.daysShort')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}
