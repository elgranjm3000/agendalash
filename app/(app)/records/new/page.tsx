'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react';
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
      setDiagnostico(existing.diagnostico ?? '');
      setIndicaciones(existing.indicaciones ?? '');
    }
  }, [existing]);

  const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v) || null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) {
      toast.error('Selecciona la clienta');
      return;
    }
    const patient = patients.find((p) => p.id === patientId);
    const doctor = users.find((u) => u.id === doctorId);
    if (!patient) return;

    const data = {
      patientId,
      patientName: `${patient.firstName} ${patient.lastName}`,
      doctorId: doctorId || (user?.id ?? ''),
      doctorName: doctor ? `Prof. ${doctor.firstName} ${doctor.lastName}` : (user ? `${user.firstName} ${user.lastName}` : ''),
      date,
      status: 'completada' as const,
      motivo: motivo.trim() || undefined,
      enfermedadActual: enfermedadActual.trim() || undefined,
      bloodPressure: bloodPressure.trim() || undefined,
      heartRate: numOrNull(heartRate),
      temperature: numOrNull(temperature),
      weight: numOrNull(weight),
      diagnostico: diagnostico.trim() || undefined,
      indicaciones: indicaciones.trim() || undefined,
    };

    setSaving(true);
    try {
      if (isEdit && existing) {
        await updateRecord(existing.id, data);
        toast.success('Ficha actualizada correctamente');
      } else {
        await addRecord(data);
        toast.success('Servicio registrado en la ficha de clienta');
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
              {isEdit ? 'Editar ficha' : 'Nueva ficha de servicio'}
            </h1>
            <p className="text-gray-600 mt-1">Registra el servicio realizado a la clienta</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Clienta y profesional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Clienta</Label>
                <PatientCombobox
                  patients={patients}
                  value={patientId}
                  onValueChange={setPatientId}
                  placeholder="Buscar clienta…"
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
                      <option key={d.id} value={d.id}>Prof. {d.firstName} {d.lastName}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Fecha del servicio</Label>
                  <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-rose-600" />
                Detalles del servicio
              </CardTitle>
              <CardDescription>Dejalos en blanco los que no correspondan.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bp">Curva usada</Label>
                  <Input id="bp" placeholder="C, D o L" value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hr">Tiempo de procesamiento (min)</Label>
                  <Input id="hr" type="number" inputMode="numeric" placeholder="15" value={heartRate} onChange={(e) => setHeartRate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temp">Permante usado (ml)</Label>
                  <Input id="temp" type="number" step="0.1" inputMode="decimal" placeholder="2" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Fijador usado (ml)</Label>
                  <Input id="weight" type="number" step="0.1" inputMode="decimal" placeholder="1" value={weight} onChange={(e) => setWeight(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Servicio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo del servicio</Label>
                <Input
                  id="motivo"
                  placeholder="Ej: Lifting con curva D"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ea">Notas del servicio</Label>
                <Textarea
                  id="ea"
                  rows={3}
                  placeholder="Notas del servicio, evolución, antecedentes de la clienta…"
                  value={enfermedadActual}
                  onChange={(e) => setEnfermedadActual(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dx">Diagnóstico / nota técnica</Label>
                <Textarea
                  id="dx"
                  rows={2}
                  placeholder="Nota técnica del servicio"
                  value={diagnostico}
                  onChange={(e) => setDiagnostico(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ind">Cuidados posteriores</Label>
                <Textarea
                  id="ind"
                  rows={2}
                  placeholder="Ej: No mojar las pestañas en 24 h, cepillo diario…"
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
              {isEdit ? 'Guardar cambios' : 'Registrar servicio'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
