'use client';

import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppointments } from '@/hooks/use-appointments';
import { cn } from '@/lib/utils';
import { useLang } from '@/contexts/i18n-context';

const appointmentTypeColors = {
  consultation: 'bg-rose-100 text-rose-800',
  checkup: 'bg-emerald-100 text-emerald-800',
  procedure: 'bg-amber-100 text-amber-800',
  'follow-up': 'bg-purple-100 text-purple-800',
};

const appointmentStatusColors = {
  scheduled: 'border-gray-300',
  confirmed: 'border-rose-500',
  completed: 'border-emerald-500',
  cancelled: 'border-red-500',
};

const appointmentDotColors = {
  scheduled: 'bg-gray-300',
  confirmed: 'bg-rose-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-red-500',
};

export function CalendarView() {
  const { t } = useLang();
  const [currentDate, setCurrentDate] = useState(new Date());
  const { appointments } = useAppointments();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const appointmentsByDate = useMemo(() => {
    const grouped: Record<string, typeof appointments> = {};
    appointments.forEach(appointment => {
      const dateKey = appointment.date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(appointment);
    });
    return grouped;
  }, [appointments]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 first-letter:uppercase">
          {format(currentDate, 'MMMM yyyy', { locale: es })}
        </h2>
        <div className="flex items-center space-x-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')} aria-label="Mes anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Hoy
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateMonth('next')} aria-label="Mes siguiente">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-2 md:p-6">
          <div className="grid grid-cols-7 gap-1 md:gap-4 mb-2 md:mb-4">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
              <div key={day} className="text-center text-[10px] md:text-sm font-medium text-gray-500 py-1 md:py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 md:gap-4">
            {days.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayAppointments = appointmentsByDate[dateKey] || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={dateKey}
                  className={cn(
                    'min-h-[44px] md:min-h-[120px] p-1 md:p-2 border rounded-md md:rounded-lg transition-colors',
                    isCurrentMonth ? 'bg-white' : 'bg-gray-50',
                    isCurrentDay && 'ring-2 ring-rose-500'
                  )}
                >
                  <div className={cn(
                    'text-xs md:text-sm font-medium mb-1 md:mb-2',
                    isCurrentMonth ? 'text-gray-900' : 'text-gray-400',
                    isCurrentDay && 'text-rose-600'
                  )}>
                    {format(day, 'd')}
                  </div>

                  {/* Mobile: compact dots + count */}
                  <div className="md:hidden space-y-0.5">
                    {dayAppointments.length > 0 && (
                      <div className="flex items-center justify-center gap-0.5 pt-0.5">
                        {dayAppointments.slice(0, 3).map(appointment => (
                          <span
                            key={appointment.id}
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              appointmentDotColors[appointment.status]
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tablet/desktop: full appointment cards */}
                  <div className="hidden md:block space-y-1">
                    {dayAppointments.slice(0, 3).map(appointment => (
                      <div
                        key={appointment.id}
                        className={cn(
                          'text-xs p-1 rounded border-l-2 bg-gray-50',
                          appointmentStatusColors[appointment.status]
                        )}
                      >
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{appointment.time}</span>
                        </div>
                        <div className="flex items-center space-x-1 mt-1">
                          <User className="h-3 w-3" />
                          <span className="truncate">{appointment.patientName}</span>
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn('text-xs mt-1', appointmentTypeColors[appointment.type])}
                        >
                          {appointment.type}
                        </Badge>
                      </div>
                    ))}

                    {dayAppointments.length > 3 && (
                      <div className="text-xs text-gray-500 p-1">
                        +{dayAppointments.length - 3} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium text-gray-900 mb-3">{t('Leyenda')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-l-2 border-gray-300 bg-gray-50"></div>
              <span className="text-sm text-gray-600">{t('Programada')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-l-2 border-rose-500 bg-gray-50"></div>
              <span className="text-sm text-gray-600">{t('Confirmada')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-l-2 border-emerald-500 bg-gray-50"></div>
              <span className="text-sm text-gray-600">{t('Completada')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-l-2 border-red-500 bg-gray-50"></div>
              <span className="text-sm text-gray-600">{t('Cancelada')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}