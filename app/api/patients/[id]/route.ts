export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { db, ensureDb } from '@/lib/db';
import { makeItemHandlers, patientsConfig, requireRequester, isNextResponse } from '@/lib/rest';

export const GET = makeItemHandlers(patientsConfig).GET;
export const PATCH = makeItemHandlers(patientsConfig).PATCH;

/**
 * DELETE elimina la clienta y en cascada sus citas, indicaciones y facturas,
 * siempre dentro de la organización del usuario.
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const requester = await requireRequester(request);
  if (isNextResponse(requester)) return requester;
  await ensureDb();

  // Verificar existencia y pertenencia antes de borrar nada
  const filters: string[] = ['id = ?'];
  const args: string[] = [params.id];
  if (requester.role !== 'super_admin') {
    filters.push('"organizationId" = ?');
    args.push(requester.organizationId!);
  }

  const existing = await db.execute({
    sql: `SELECT id FROM patients WHERE ${filters.join(' AND ')}`,
    args,
  });
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const dependents = [
    'DELETE FROM appointments WHERE "patientId" = ?',
    'DELETE FROM prescriptions WHERE "patientId" = ?',
    'DELETE FROM invoices WHERE "patientId" = ?',
    'DELETE FROM patients WHERE id = ?',
  ];
  await db.batch(dependents.map(sql => ({ sql, args: [params.id] })));

  return NextResponse.json({ success: true });
}
