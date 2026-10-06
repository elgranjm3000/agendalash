'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, HeartPulse, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PatientCombobox } from '@/components/patient-combobox';
import { usePatients } from '@/hooks/use-patients';
import { useUsers } from '@/hooks/use-users';
import { useMedicalRecords } from '@/hooks/use-medical-records';
import { useAuth } from '@/contexts/auth-context';

export default function NewRecordPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const isEdit = Boolean(params?.id);
  const { user } = useAuth();
  const { patients } = usePatients();
  const { users, getDoctors } = useUsers();
  const { records, addRecord, updateRecord } = useMedicalRecords();
  const doctors = getDoctors();

  const existing = isEdit ? records.find((r) => r.id === params.id) : null;

  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [motivo, setMotivo] = useState('');
  const [enfermedadActual, setEnfermedadActual] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [temperature, setTemperature] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [oxygenSat, setOxygenSat] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [indicaciones, setIndicaciones] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const p = search?.get('patient');
    if (p) setPatientId(p);
  }, [search]);

  useEffect(() => {
    if (user?.role === 'doctor' && user.id) setDoctorId(user.id);
  }, [user]);

  useEffect(() => {
    if (existing) {
      setPatientId(existing.patientId);
      setDoctorId(existing.doctorId);
      setDate(existing.date);
      setMotivo(existing.motivo ?? '');
      setEnfermedadActual(existing.enfermedadActual ?? '');
      setBloodPressure(existing.bloodPressure ?? '');
      setHeartRate(existing.heartRate?.toString() ?? '');
      setTemperature(existing.temperature?.toString() ?? '');
      setWeight(existing.weight?.toString() ?? '');
      setHeight(existing.height?.toString() ?? '');
      setOxygenSat(existing.oxygenSat?.toString() ?? '');
      setDiagnostico(existing.diagnostico ?? '');
      setIndicaciones(existing.indicaciones ?? '');
    }
  }, [existing]);

  const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v) || null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) {
      toast.error('Selecciona el paciente');
      return;
    }
    const patient = patients.find((p) => p.id === patientId);
    const doctor = users.find((u) => u.id === doctorId);
    if (!patient) return;

    const data = {
      patientId,
      patientName: `${patient.firstName} ${patient.lastName}`,
      doctorId: doctorId || (user?.id ?? ''),
      doctorName: doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : (user ? `${user.firstName} ${user.lastName}` : ''),
      date,
      status: 'completada' as const,
      motivo: motivo.trim() || undefined,
      enfermedadActual: enfermedadActual.trim() || undefined,
      bloodPressure: bloodPressure.trim() || undefined,
      heartRate: numOrNull(heartRate),
      temperature: numOrNull(temperature),
      weight: numOrNull(weight),
      height: numOrNull(height),
      oxygenSat: numOrNull(oxygenSat),
      diagnostico: diagnostico.trim() || undefined,
      indicaciones: indicaciones.trim() || undefined,
    };

    setSaving(true);
    try {
      if (isEdit && existing) {
        await updateRecord(existing.id, data);
        toast.success('Consulta actualizada correctamente');
      } else {
        await addRecord(data);
        toast.success('Consulta registrada en la historia clínica');
      }
      router.push(`/records?patient=${patientId}`);
    } catch {
      toast.error('No se pudo guardar. Intentá de nuevo.');
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="min-h-[40px] min-w-[40px]">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEdit ? 'Editar Consulta' : 'Nueva Consulta'}
            </h1>
            <p className="text-gray-600 mt-1">Registra el episodio clínico del paciente</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paciente y profesional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Paciente</Label>
                <PatientCombobox
                  patients={patients}
                  value={patientId}
                  onValueChange={setPatientId}
                  placeholder="Buscar paciente…"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="doctorId">Profesional</Label>
                  <select
                    id="doctorId"
                    value={doctorId}
                    onChange={(e) => setDoctorId(e.target.value)}
                    disabled={user?.role === 'doctor'}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                  >
                    <option value="">Seleccionar…</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Fecha de la consulta</Label>
                  <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HeartPulse className="h-5 w-5 text-rose-600" />
                Signos vitales
              </CardTitle>
              <CardDescription>Dejalos en blanco los que no correspondan.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bp">Presión arterial</Label>
                  <Input id="bp" placeholder="120/80" value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hr">FC (lpm)</Label>
                  <Input id="hr" type="number" inputMode="numeric" placeholder="72" value={heartRate} onChange={(e) => setHeartRate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temp">Temp (°C)</Label>
                  <Input id="temp" type="number" step="0.1" inputMode="decimal" placeholder="36.5" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Peso (kg)</Label>
                  <Input id="weight" type="number" step="0.1" inputMode="decimal" placeholder="70" value={weight} onChange={(e) => setWeight(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Talla (m)</Label>
                  <Input id="height" type="number" step="0.01" inputMode="decimal" placeholder="1.70" value={height} onChange={(e) => setHeight(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spo2">SpO₂ (%)</Label>
                  <Input id="spo2" type="number" inputMode="numeric" placeholder="98" value={oxygenSat} onChange={(e) => setOxygenSat(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Consulta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo de consulta</Label>
                <Input
                  id="motivo"
                  placeholder="Ej: Dolor lumbar de 3 días"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ea">Enfermedad actual</Label>
                <Textarea
                  id="ea"
                  rows={3}
                  placeholder="Relato del cuadro clínico, evolución, antecedentes del episodio…"
                  value={enfermedadActual}
                  onChange={(e) => setEnfermedadActual(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dx">Diagnóstico</Label>
                <Textarea
                  id="dx"
                  rows={2}
                  placeholder="Diagnóstico presuntivo o confirmado"
                  value={diagnostico}
                  onChange={(e) => setDiagnostico(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ind">Plan e indicaciones</Label>
                <Textarea
                  id="ind"
                  rows={2}
                  placeholder="Indicaciones, estudios solicitados, control…"
                  value={indicaciones}
                  onChange={(e) => setIndicaciones(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="flex items-center gap-2 min-h-[44px]">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Guardar cambios' : 'Registrar consulta'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
