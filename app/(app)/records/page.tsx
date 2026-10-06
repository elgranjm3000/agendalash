'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Stethoscope,
  Plus,
  HeartPulse,
  Thermometer,
  Weight,
  Activity,
  Wind,
  Ruler,
  Pencil,
  Trash2,
  FileText,
  StickyNote,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PatientCombobox } from '@/components/patient-combobox';
import { usePatients } from '@/hooks/use-patients';
import { useMedicalRecords } from '@/hooks/use-medical-records';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { MedicalRecord } from '@/lib/types';
import { cn } from '@/lib/utils';

function Vital({ icon: Icon, label, value, unit }: { icon: typeof HeartPulse; label: string; value?: number | string | null; unit: string }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-center gap-1.5 rounded-md bg-gray-50 px-2.5 py-1.5">
      <Icon className="h-3.5 w-3.5 text-rose-600" />
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-semibold tabular-nums text-gray-900">{value}{unit}</span>
    </div>
  );
}

export default function RecordsPage() {
  const { user } = useAuth();
  const { patients, loading: loadingPatients } = usePatients();
  const { records, loading, deleteRecord } = useMedicalRecords();

  const [patientId, setPatientId] = useState('');

  useEffect(() => {
    // auto-seleccionar si viene ?patient= desde la lista de pacientes
    const q = new URLSearchParams(window.location.search).get('patient');
    if (q) setPatientId(q);
  }, []);

  const patient = patients.find((p) => p.id === patientId);

  const patientRecords = useMemo(() => {
    if (!patientId) return records;
    return records
      .filter((r) => r.patientId === patientId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, patientId]);

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar esta consulta de la historia clínica?')) {
      try {
        await deleteRecord(id);
        toast.success('Consulta eliminada');
      } catch {
        toast.error('No se pudo eliminar');
      }
    }
  };

  if (loading || loadingPatients) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Stethoscope className="h-8 w-8 text-rose-600" />
            Historia Clínica
          </h1>
          <p className="text-gray-600 mt-1">
            Episodios de consulta con signos vitales, diagnóstico e indicaciones
          </p>
        </div>
        <div className="flex items-center gap-2">
          {patientId && (
            <Link href={`/records/print?patient=${patientId}`}>
              <Button variant="outline" className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Imprimir historia
              </Button>
            </Link>
          )}
          <Link href={`/records/new${patientId ? `?patient=${patientId}` : ''}`}>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nueva Consulta
            </Button>
          </Link>
        </div>
      </div>

      {/* Selector de paciente */}
      <Card>
        <CardContent className="p-4">
          <PatientCombobox
            patients={patients}
            value={patientId}
            onValueChange={setPatientId}
            placeholder="Buscar paciente para ver su historia clínica…"
          />
          {patient && (
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-gray-600 border-t border-gray-100 pt-3">
              <span className="font-semibold text-gray-900">{patient.firstName} {patient.lastName}</span>
              {patient.dateOfBirth && (
                <span>Nacimiento: {format(new Date(patient.dateOfBirth), 'd/MM/yyyy')}</span>
              )}
              <span>{patient.phone}</span>
              {patient.medicalHistory && (
                <span className="basis-full flex items-start gap-1.5 text-xs bg-amber-50 border border-amber-100 rounded-md px-2.5 py-1.5">
                  <StickyNote className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600" />
                  <span><strong>Antecedentes:</strong> {patient.medicalHistory}</span>
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      {patientRecords.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {patientId ? 'Sin consultas registradas' : 'Selecciona un paciente'}
            </h3>
            <p className="text-gray-600 mb-6">
              {patientId
                ? 'Registra la primera consulta para comenzar su historia clínica.'
                : 'O consultá el historial completo de todas las consultas.'}
            </p>
            <Link href={`/records/new${patientId ? `?patient=${patientId}` : ''}`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Consulta
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="relative pl-4 border-l-2 border-rose-100 space-y-4">
          {patientRecords.map((r: MedicalRecord) => (
            <div key={r.id} className="relative">
              <div className="absolute -left-[1.42rem] top-6 h-2.5 w-2.5 rounded-full bg-rose-500 ring-4 ring-rose-50" />
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {format(new Date(r.date), "d 'de' MMMM 'de' yyyy", { locale: es })}
                        {r.status === 'triaje' && (
                          <Badge className={cn('ml-2 align-middle', r.triageLevel === 'rojo' ? 'bg-red-100 text-red-800' : r.triageLevel === 'amarillo' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')}>
                            Triaje pendiente
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">Dr. {r.doctorName}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" asChild title="Recetar desde esta consulta">
                        <Link href={`/prescriptions/new?patient=${r.patientId}&record=${r.id}`}>
                          <FileText className="h-4 w-4 text-rose-600" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild title="Editar">
                        <Link href={`/records/${r.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(r.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {(r.bloodPressure || r.heartRate || r.temperature || r.weight || r.height || r.oxygenSat) && (
                    <div className="flex flex-wrap gap-2">
                      <Vital icon={Activity} label="PA" value={r.bloodPressure} unit=" mmHg" />
                      <Vital icon={HeartPulse} label="FC" value={r.heartRate} unit=" lpm" />
                      <Vital icon={Thermometer} label="Temp" value={r.temperature} unit="°C" />
                      <Vital icon={Weight} label="Peso" value={r.weight} unit=" kg" />
                      <Vital icon={Ruler} label="Talla" value={r.height} unit=" m" />
                      <Vital icon={Wind} label="SpO₂" value={r.oxygenSat} unit="%" />
                    </div>
                  )}

                  {r.motivo && (
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold text-gray-900">Motivo: </span>{r.motivo}
                    </p>
                  )}
                  {r.diagnostico && (
                    <p className="text-sm text-gray-700">
                      <Badge className="bg-rose-100 text-rose-800 mr-1.5">Diagnóstico</Badge>
                      {r.diagnostico}
                    </p>
                  )}
                  {r.indicaciones && (
                    <p className="text-sm text-gray-600 border-l-2 border-gray-200 pl-3 italic">
                      {r.indicaciones}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
