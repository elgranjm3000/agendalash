import { db, InValue } from './db';

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

/**
 * Detecta si una cita se solapa con otra del mismo doctor (mismo día,
 * estado distinto de cancelado). Devuelve el mensaje de conflicto o null.
 */
export async function findScheduleConflict(opts: {
  doctorId: string;
  date: string;
  time: string;
  duration: number;
  excludeId?: string;
}): Promise<string | null> {
  const filters = [
    '"doctorId" = ?',
    'date = ?',
    "status != 'cancelled'",
  ];
  const args: InValue[] = [opts.doctorId, opts.date];
  if (opts.excludeId) {
    filters.push('id != ?');
    args.push(opts.excludeId);
  }

  const result = await db.execute({
    sql: `SELECT "patientName", time, duration FROM appointments WHERE ${filters.join(' AND ')}`,
    args,
  });

  const newStart = toMinutes(opts.time);
  const newEnd = newStart + opts.duration;

  for (const row of result.rows) {
    const start = toMinutes(row.time as string);
    const end = start + Number(row.duration);
    if (newStart < end && start < newEnd) {
      return `El doctor ya tiene una cita de ${row.patientName} a las ${row.time} (${row.duration} min) que se solapa con este horario.`;
    }
  }
  return null;
}
