'use client';

import { Calendar as CalendarIcon } from 'lucide-react';
import { CalendarView } from '@/components/calendar-view';

export default function CalendarPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <CalendarIcon className="h-8 w-8 text-rose-600" />
          Calendario de Citas
        </h1>
        <p className="text-gray-600 mt-1">
          Vista mensual de todas las citas programadas
        </p>
      </div>

      <CalendarView />
    </div>
  );
}