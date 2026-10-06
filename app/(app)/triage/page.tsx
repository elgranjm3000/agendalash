'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { Activity, ArrowRight, CheckCircle2, Thermometer, Wind } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PatientCombobox } from '@/components/patient-combobox';
import { usePatients } from '@/hooks/use-patients';
import { useMedicalRecords } from '@/hooks/use-medical-records';
import { useAuth } from '@/contexts/auth-context';
import { MedicalRecord } from '@/lib/types';
import { cn } from '@/lib/utils';

const triageLevels = [
  { value: 'rojo', label: 'Emergencia', description: 'Atención inmediata', card: 'border-red-300 bg-red-50', dot: 'bg-red-500', badge: 'bg-red-100 text-red-800' },
  { value: 'amarillo', label: 'Urgente', description: 'Atender pronto', card: 'border-amber-300 bg-amber-50', dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-800' },
  { value: 'verde', label: 'No urgente', description: 'Puede esperar', card: 'border-emerald-300 bg-emerald-50', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800' },
] as const;

export default function TriagePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { patients } = usePatients();
  const { records, addRecord } = useMedicalRecords();

  const [patientId, setPatientId] = useState('');
  const [level, setLevel] = useState<'verde' | 'amarillo' | 'rojo'>('verde');
  const [motivo, setMotivo] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [temperature, setTemperature] = useState('');
  const [oxygenSat, setOxygenSat] = useState('');
  const [saving, setSaving] = useState(false);

  const pending = useMemo(
    () => records
      .filter((r) => r.status === 'triaje')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [records]
  );

  const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v) || null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find((p) => p.id === patientId);
    if (!patient) {
      toast.error('Selecciona el paciente');
      return;
    }
    setSaving(true);
    try {
      await addRecord({
        patientId,
        patientName: `${patient.firstName} ${patient.lastName}`,
        doctorId: user?.id ?? '',
        doctorName: user ? `${user.firstName} ${user.lastName}` : 'Recepción',
        date: new Date().toISOString().split('T')[0],
        status: 'triaje',
        triageLevel: level,
        motivo: motivo.trim() || undefined,
        bloodPressure: bloodPressure.trim() || undefined,
        heartRate: numOrNull(heartRate),
        temperature: numOrNull(temperature),
        oxygenSat: numOrNull(oxygenSat),
      });
      toast.success('Triaje registrado — el paciente está en la lista de espera');
      setPatientId('');
      setMotivo('');
      setBloodPressure('');
      setHeartRate('');
      setTemperature('');
      setOxygenSat('');
    } catch {
      toast.error('No se pudo registrar el triaje');
    } finally {
      setSaving(false);
    }
  };

  const complete = async (r: MedicalRecord) => {
    router.push(`/records/${r.id}/edit`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Activity className="h-8 w-8 text-rose-600" />
          Triaje
        </h1>
        <p className="text-gray-600 mt-1">
          Registra al paciente que llega y su nivel de urgencia; el doctor completa la consulta después
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario */}
        <Card>
          <CardHeader>
            <CardTitle>Llegada de paciente</CardTitle>
            <CardDescription>Toma los signos vitales básicos y clasificá la urgencia.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Paciente</Label>
                <PatientCombobox
                  patients={patients}
                  value={patientId}
                  onValueChange={setPatientId}
                  placeholder="Buscar paciente…"
                />
              </div>

              <div className="space-y-2">
                <Label>Nivel de urgencia</Label>
                <div className="grid grid-cols-3 gap-2">
                  {triageLevels.map((l) => (
                    <button
                      key={l.value}
                      type="button"
                      onClick={() => setLevel(l.value)}
                      className={cn(
                        'rounded-lg border p-3 text-left transition-colors min-h-[44px]',
                        level === l.value
                          ? cn(l.card, 'ring-1 ring-current')
                          : 'border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className={cn('h-2 w-2 rounded-full', l.dot)} />
                        <span className="text-sm font-semibold text-gray-900">{l.label}</span>
                      </span>
                      <span className="block text-xs text-gray-500 mt-0.5">{l.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo de llegada</Label>
                <Input
                  id="motivo"
                  placeholder="Ej: Dolor de cabeza desde ayer"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="t-bp">PA (mmHg)</Label>
                  <Input id="t-bp" placeholder="120/80" value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="t-hr" className="flex items-center gap-1"><Activity className="h-3.5 w-3.5" /> FC</Label>
                  <Input id="t-hr" type="number" inputMode="numeric" placeholder="72" value={heartRate} onChange={(e) => setHeartRate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="t-temp" className="flex items-center gap-1"><Thermometer className="h-3.5 w-3.5" /> Temp</Label>
                  <Input id="t-temp" type="number" step="0.1" inputMode="decimal" placeholder="36.5" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="t-spo2" className="flex items-center gap-1"><Wind className="h-3.5 w-3.5" /> SpO₂</Label>
                  <Input id="t-spo2" type="number" inputMode="numeric" placeholder="98" value={oxygenSat} onChange={(e) => setOxygenSat(e.target.value)} />
                </div>
              </div>

              <Button type="submit" disabled={saving} className="w-full min-h-[44px]">
                Registrar triaje
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Lista de espera */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de espera</CardTitle>
            <CardDescription>
              {pending.length === 0 ? 'Sin pacientes en espera.' : `${pending.length} paciente(s) en espera de consulta.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.length === 0 && (
              <div className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-200 mb-2" />
                <p className="text-sm text-gray-500">Todos los pacientes fueron atendidos.</p>
              </div>
            )}
            {pending.map((r) => {
              const levelInfo = triageLevels.find((l) => l.value === (r.triageLevel ?? 'verde'))!;
              return (
                <div key={r.id} className="rounded-lg border border-gray-200 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{r.patientName}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(r.createdAt), 'HH:mm', { locale: es })} · {r.motivo || 'Sin motivo indicado'}
                      </p>
                    </div>
                    <Badge className={levelInfo.badge}>{levelInfo.label}</Badge>
                  </div>
                  {(r.bloodPressure || r.heartRate) && (
                    <p className="text-xs text-gray-600">
                      PA {r.bloodPressure ?? '—'} · FC {r.heartRate ?? '—'} · Temp {r.temperature ?? '—'}°C · SpO₂ {r.oxygenSat ?? '—'}%
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => complete(r)}
                    className="w-full min-h-[36px] flex items-center gap-1.5"
                  >
                    Completar consulta
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
