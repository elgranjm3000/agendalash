'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PrintDocument } from '@/components/print-document';
import { useOrgSettings } from '@/hooks/use-org-settings';
import { apiList } from '@/lib/api';
import { Patient, MedicalRecord, Prescription } from '@/lib/types';


function PrintRecordContent() {
  const search = useSearchParams();
  const patientId = search?.get('patient') ?? '';
  const { orgName, orgLogo } = useOrgSettings();

  const fetchDoc = async () => {
    const [patients, records, prescriptions] = await Promise.all([
      apiList<Patient>('patients'),
      apiList<MedicalRecord>('medical-records'),
      apiList<Prescription>('prescriptions'),
    ]);
    const patient = patients.find((p) => p.id === patientId);
    if (!patient) return null;
    const episodes = records
      .filter((r) => r.patientId === patientId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const rxs = prescriptions.filter((p) => p.patientId === patientId);
    return { patient, episodes, rxs };
  };

  return (
    <PrintDocument fetchDoc={fetchDoc}>
      {(doc) => {
        const { patient, episodes, rxs } = doc as {
          patient: Patient;
          episodes: MedicalRecord[];
          rxs: Prescription[];
        };
        const lastDoctor = episodes[episodes.length - 1];

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
                <p className="mt-1 text-sm text-gray-500">Ficha de clienta</p>
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>
                  Emitida: <span className="font-medium text-gray-900">
                    {format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}
                  </span>
                </p>
                <p className="text-xs">{episodes.length} consulta(s) registrada(s)</p>
              </div>
            </div>

            {/* Datos de la clienta */}
            <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Clienta</p>
                <p className="text-lg font-semibold">{patient.firstName} {patient.lastName}</p>
              </div>
              <div className="space-y-0.5">
                {patient.dateOfBirth && (
                  <p className="text-gray-600">
                    Nacimiento: <span className="font-medium">{format(new Date(patient.dateOfBirth), 'd/MM/yyyy')}</span>
                  </p>
                )}
                <p className="text-gray-600">Teléfono: <span className="font-medium">{patient.phone}</span></p>
                <p className="text-gray-600">Email: <span className="font-medium">{patient.email}</span></p>
              </div>
              {patient.medicalHistory && (
                <div className="col-span-2 mt-2 rounded-md bg-amber-50 border border-amber-100 p-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">Antecedentes</p>
                  <p className="mt-1 text-sm">{patient.medicalHistory}</p>
                </div>
              )}
            </div>

            {/* Episodios */}
            <h2 className="mt-8 text-sm font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-1">
              Consultas
            </h2>
            {episodes.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">Sin consultas registradas.</p>
            ) : (
              <div className="mt-4 space-y-5">
                {episodes.map((r) => (
                  <div key={r.id} className="break-inside-avoid">
                    <div className="flex items-baseline justify-between border-b border-gray-100 pb-1">
                      <p className="font-semibold">
                        {format(new Date(r.date), "d 'de' MMMM 'de' yyyy", { locale: es })}
                      </p>
                      <p className="text-xs text-gray-500">Prof. {r.doctorName}</p>
                    </div>
                    {(r.bloodPressure || r.heartRate || r.temperature || r.weight || r.oxygenSat) && (
                      <p className="mt-1 text-xs text-gray-600">
                        Curva {r.bloodPressure || '—'} · Procesamiento {r.heartRate ?? '—'} min · Permante {r.temperature ?? '—'} ml · Fijador {r.weight ?? '—'} ml
                      </p>
                    )}
                    {r.motivo && (
                      <p className="mt-1 text-sm"><strong>Motivo:</strong> {r.motivo}</p>
                    )}
                    {r.enfermedadActual && (
                      <p className="mt-0.5 text-sm text-gray-700">{r.enfermedadActual}</p>
                    )}
                    {r.diagnostico && (
                      <p className="mt-0.5 text-sm"><strong>Nota técnica:</strong> {r.diagnostico}</p>
                    )}
                    {r.indicaciones && (
                      <p className="mt-0.5 text-sm text-gray-600"><strong>Indicaciones:</strong> {r.indicaciones}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Recetas emitidas */}
            {rxs.length > 0 && (
              <>
                <h2 className="mt-8 text-sm font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-1">
                  Prescripciones
                </h2>
                <div className="mt-3 space-y-1.5">
                  {rxs.map((p) => (
                    <p key={p.id} className="text-sm break-inside-avoid">
                      <span className="tabular-nums text-gray-500">
                        {format(new Date(p.createdAt), 'd/MM/yy')}
                      </span>{' '}
                      — {p.medications.map((m) => `${m.name} (${m.dosage})`).join(', ')}
                    </p>
                  ))}
                </div>
              </>
            )}

            {/* Firma del profesional tratante */}
            {lastDoctor && (
              <div className="mt-16 flex justify-end">
                <div className="w-72 text-center break-inside-avoid">
                  <div className="border-t border-gray-400 pt-2">
                    <p className="text-sm font-semibold">Prof. {lastDoctor.doctorName}</p>
                    <p className="mt-1 text-xs text-gray-400">Profesional tratante — Firma y sello</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-12 border-t border-gray-200 pt-4 text-xs text-gray-400">
              Generado por AgendaLash — Documento confidencial del estudio.
            </div>
          </div>
        );
      }}
    </PrintDocument>
  );
}

export default function PrintRecordsPage() {
  return (
    <Suspense>
      <PrintRecordContent />
    </Suspense>
  );
}
