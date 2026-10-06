'use client';
import { useLang } from '@/contexts/i18n-context';

import { useMemo } from 'react';
import { format, isToday, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Users, 
  Calendar, 
  ClipboardList, 
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/stats-card';
import { usePatients } from '@/hooks/use-patients';
import { useAppointments } from '@/hooks/use-appointments';
import Link from 'next/link';

export default function Dashboard() {
  const { t } = useLang();
  const { patients } = usePatients();
  const { appointments } = useAppointments();

  const stats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const todayAppointments = appointments.filter(apt => apt.date === today);
    const completedAppointments = appointments.filter(apt => apt.status === 'completed');
    const scheduledAppointments = appointments.filter(apt => apt.status === 'scheduled');
    const cancelledAppointments = appointments.filter(apt => apt.status === 'cancelled');
    
    return {
      totalPatients: patients.length,
      totalAppointments: appointments.length,
      todayAppointments: todayAppointments.length,
      completedRate: appointments.length > 0 ? Math.round((completedAppointments.length / appointments.length) * 100) : 0,
      upcomingAppointments: scheduledAppointments.length,
    };
  }, [patients, appointments]);

  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    const upcoming = appointments
      .filter(apt => {
        const appointmentDate = new Date(apt.date);
        return appointmentDate >= now && apt.status === 'scheduled';
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
    
    return upcoming;
  }, [appointments]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'confirmed':
        return <Clock className="h-4 w-4 text-rose-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-amber-600" />;
    }
  };

  const getDateLabel = (date: string) => {
    const appointmentDate = new Date(date);
    if (isToday(appointmentDate)) return 'Hoy';
    if (isTomorrow(appointmentDate)) return 'Mañana';
    return format(appointmentDate, 'dd MMM', { locale: es });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Bienvenido al sistema de gestión de citas médicas
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Pacientes"
          value={stats.totalPatients}
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="Citas de Hoy"
          value={stats.todayAppointments}
          icon={Calendar}
          color="emerald"
        />
        <StatsCard
          title="Total Citas"
          value={stats.totalAppointments}
          icon={ClipboardList}
          color="amber"
        />
        <StatsCard
          title="Tasa de Completado"
          value={`${stats.completedRate}%`}
          icon={TrendingUp}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Appointments */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Próximas Citas</CardTitle>
              <Link href="/appointments">
                <Button variant="outline" size="sm">
                  Ver todas
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>{t('No hay citas programadas')}</p>
                  <Link href="/appointments/new">
                    <Button className="mt-4">
                      Programar Nueva Cita
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(appointment.status)}
                          <div>
                            <p className="font-medium text-gray-900">
                              {appointment.patientName}
                            </p>
                            <p className="text-sm text-gray-600">
                              {getDateLabel(appointment.date)} a las {appointment.time}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">
                          {appointment.type}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {appointment.duration} min
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/patients/new">
                <Button className="w-full justify-start" variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Nuevo Paciente
                </Button>
              </Link>
              <Link href="/appointments/new">
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Nueva Cita
                </Button>
              </Link>
              <Link href="/calendar">
                <Button className="w-full justify-start" variant="outline">
                  <Clock className="h-4 w-4 mr-2" />
                  Ver Calendario
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                  <span className="text-gray-600">
                    Sistema iniciado correctamente
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-gray-600">
                    {stats.totalPatients} pacientes en el sistema
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span className="text-gray-600">
                    {stats.upcomingAppointments} citas programadas
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}