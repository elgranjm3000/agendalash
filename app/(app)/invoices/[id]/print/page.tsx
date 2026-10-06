'use client';
import { useLang } from '@/contexts/i18n-context';

import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PrintDocument } from '@/components/print-document';
import { useOrgSettings } from '@/hooks/use-org-settings';
import { formatMoney } from '@/lib/format';
import { apiGetOne } from '@/lib/api';
import { Invoice } from '@/lib/types';

const statusLabels: Record<string, string> = {
  pending: 'Pendiente de pago',
  paid: 'Pagada',
  overdue: 'Vencida',
  cancelled: 'Anulada',
};

export default function PrintInvoicePage() {
  const { t } = useLang();
  const params = useParams<{ id: string }>();
  const { orgName, currency, orgLogo } = useOrgSettings();

  const fetchDoc = () => apiGetOne<Invoice>('invoices', params.id);

  return (
    <PrintDocument fetchDoc={fetchDoc}>
      {(doc) => {
        const invoice = doc as Invoice;
        const money = (n: unknown) => formatMoney(n, currency);
        const fecha = format(new Date(invoice.createdAt), "d 'de' MMMM 'de' yyyy", { locale: es });
        const vencimiento = invoice.dueDate
          ? format(new Date(invoice.dueDate), 'd/MM/yyyy', { locale: es })
          : '—';

        return (
          <div className="text-gray-900">
            {/* Encabezado */}
            <div className="flex items-start justify-between border-b-2 border-rose-600 pb-6">
              <div className="flex items-center gap-3">
                {orgLogo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={orgLogo} alt="" className="h-12 w-auto max-w-[120px] object-contain" />
                )}
                <h1 className="text-2xl font-bold text-rose-700 tracking-tight">{orgName || 'AgendaLash'}</h1>
              </div>
              <div>
                <p className="mt-1 text-sm text-gray-500">{t('Documento de factura')}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{t('Factura Nº')}</p>
                <p className="text-lg font-semibold tabular-nums">
                  {invoice.id.slice(0, 8).toUpperCase()}
                </p>
                <span
                  className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                    invoice.status === 'paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : invoice.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                  }`}
                >
                  {statusLabels[invoice.status] ?? invoice.status}
                </span>
              </div>
            </div>

            {/* Datos del paciente y fechas */}
            <div className="mt-8 grid grid-cols-2 gap-8 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{t('Paciente')}</p>
                <p className="mt-1 text-base font-semibold">{invoice.patientName}</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-gray-500">
                  Fecha de emisión: <span className="font-medium text-gray-900">{fecha}</span>
                </p>
                <p className="text-gray-500">
                  Vencimiento: <span className="font-medium text-gray-900">{vencimiento}</span>
                </p>
                {invoice.paidDate && (
                  <p className="text-gray-500">
                    Fecha de pago: <span className="font-medium text-gray-900">
                      {format(new Date(invoice.paidDate), 'd/MM/yyyy', { locale: es })}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Detalle */}
            <table className="mt-10 w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300 text-left">
                  <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-widest text-gray-400">{t('Descripción')}</th>
                  <th className="py-2 px-4 text-right text-xs font-semibold uppercase tracking-widest text-gray-400">{t('Cant.')}</th>
                  <th className="py-2 px-4 text-right text-xs font-semibold uppercase tracking-widest text-gray-400">{t('Precio unit.')}</th>
                  <th className="py-2 pl-4 text-right text-xs font-semibold uppercase tracking-widest text-gray-400">{t('Importe')}</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-3 pr-4 font-medium">{item.description}</td>
                    <td className="py-3 px-4 text-right tabular-nums">{item.quantity}</td>
                    <td className="py-3 px-4 text-right tabular-nums">{money(item.unitPrice)}</td>
                    <td className="py-3 pl-4 text-right font-medium tabular-nums">{money(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totales */}
            <div className="mt-8 flex justify-end">
              <div className="w-72 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('Subtotal')}</span>
                  <span className="tabular-nums">{money(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('Impuestos')}</span>
                  <span className="tabular-nums">{money(invoice.tax)}</span>
                </div>
                <div className="flex justify-between border-t-2 border-rose-600 pt-2 text-base font-bold">
                  <span>{t('Total')}</span>
                  <span className="tabular-nums text-rose-700">{money(invoice.total)}</span>
                </div>
              </div>
            </div>

            {invoice.notes && (
              <div className="mt-10 rounded-md bg-gray-50 p-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{t('Observaciones')}</p>
                <p className="mt-1">{invoice.notes}</p>
              </div>
            )}

            {/* Pie */}
            <div className="mt-16 border-t border-gray-200 pt-4 flex items-center justify-between text-xs text-gray-400">
              <span>{t('Generado por AgendaLash')}</span>
              <span>{t('Documento válido como comprobante de la prestación facturada.')}</span>
            </div>
          </div>
        );
      }}
    </PrintDocument>
  );
}
