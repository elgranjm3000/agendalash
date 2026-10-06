'use client';
import { useLang } from '@/contexts/i18n-context';

import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PrintDocument } from '@/components/print-document';
import { useOrgSettings } from '@/hooks/use-org-settings';
import { apiGetOne } from '@/lib/api';
import { useUsers } from '@/hooks/use-users';
import { roleLabels } from '@/lib/roles';
import { Prescription } from '@/lib/types';

export default function PrintPrescriptionPage() {
  const { t } = useLang();
  const params = useParams<{ id: string }>();
  const { users } = useUsers();
  const { orgName, orgLogo } = useOrgSettings();

  const fetchDoc = () => apiGetOne<Prescription>('prescriptions', params.id);

  return (
    <PrintDocument fetchDoc={fetchDoc}>
      {(doc) => {
        const rx = doc as Prescription;
        const doctor = users.find((u) => u.id === rx.doctorId);
        const fecha = format(new Date(rx.createdAt), "d 'de' MMMM 'de' yyyy", { locale: es });

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
                <p className="mt-1 text-sm text-gray-500">{t('Receta médica')}</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold leading-none text-rose-600">℞</p>
                <p className="mt-2 text-sm text-gray-500">
                  Nº <span className="font-medium tabular-nums">{rx.id.slice(0, 8).toUpperCase()}</span>
                </p>
              </div>
            </div>

            {/* Doctor y paciente */}
            <div className="mt-8 grid grid-cols-2 gap-8 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{t('Profesional')}</p>
                <p className="mt-1 text-base font-semibold">Dr. {rx.doctorName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{t('Paciente')}</p>
                <p className="mt-1 text-base font-semibold">{rx.patientName}</p>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Fecha de emisión: <span className="font-medium text-gray-900">{fecha}</span>
            </div>

            {/* Diagnóstico */}
            {rx.diagnosis && (
              <div className="mt-8">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{t('Diagnóstico')}</p>
                <p className="mt-1 text-sm">{rx.diagnosis}</p>
              </div>
            )}

            {/* Medicamentos */}
            <div className="mt-8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-gray-200 bg-gray-50 text-left">
                    <th className="py-2.5 pr-4 pl-3 text-xs font-semibold uppercase tracking-widest text-gray-500">{t('Medicamento')}</th>
                    <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-widest text-gray-500">{t('Dosis')}</th>
                    <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-widest text-gray-500">{t('Frecuencia')}</th>
                    <th className="py-2.5 px-4 text-xs font-semibold uppercase tracking-widest text-gray-500">{t('Duración')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rx.medications.map((med) => (
                    <tr key={med.id} className="border-b border-gray-100">
                      <td className="py-3 pr-4 pl-3 font-semibold">{med.name}</td>
                      <td className="py-3 px-4">{med.dosage}</td>
                      <td className="py-3 px-4">{med.frequency}</td>
                      <td className="py-3 px-4">{med.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Indicaciones */}
            {rx.instructions && (
              <div className="mt-8">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{t('Indicaciones generales')}</p>
                <p className="mt-1 text-sm leading-relaxed">{rx.instructions}</p>
              </div>
            )}

            {/* Firma */}
            <div className="mt-24 flex justify-end">
              <div className="w-72 text-center">
                {doctor?.signature && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={doctor.signature}
                    alt={`Firma del Dr. ${rx.doctorName}`}
                    className="mx-auto mb-1 h-20 object-contain object-bottom"
                  />
                )}
                <div className="border-t border-gray-400 pt-2">
                  <p className="text-sm font-semibold">Dr. {rx.doctorName}</p>
                  <p className="text-xs text-gray-500">
                    {doctor ? roleLabels[doctor.role] : 'Médico'} · Matricula profesional
                  </p>
                  <p className="mt-1 text-xs text-gray-400">{t('Firma y sello')}</p>
                </div>
              </div>
            </div>

            {/* Pie */}
            <div className="mt-16 border-t border-gray-200 pt-4 flex items-center justify-between text-xs text-gray-400">
              <span>{t('Generado por AgendaLash')}</span>
              <span>{t('Este documento carece de validez sin la firma del profesional.')}</span>
            </div>
          </div>
        );
      }}
    </PrintDocument>
  );
}
