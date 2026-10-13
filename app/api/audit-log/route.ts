export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { db, ensureDb } from '@/lib/db';
import { requireRequester, isNextResponse } from '@/lib/rest';

/** GET /api/audit-log — solo super admin. Filtros: ?action= &userId= &limit= */
export async function GET(request: Request) {
  const requester = await requireRequester(request);
  if (isNextResponse(requester)) return requester;
  if (requester.role !== 'super_admin') {
    return NextResponse.json({ error: 'Solo el super admin puede ver la auditoría' }, { status: 403 });
  }
  await ensureDb();

  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const userId = url.searchParams.get('userId');
  const limit = Math.min(Number(url.searchParams.get('limit')) || 300, 1000);

  const filters: string[] = [];
  const args: (string | number)[] = [];
  if (action) {
    filters.push('action = ?');
    args.push(action);
  }
  if (userId) {
    filters.push('"userId" = ?');
    args.push(userId);
  }

  const result = await db.execute({
    sql: `SELECT id, ts, "userId", "userEmail", "userName", "organizationId", action, entity, "entityId", detail, ip
          FROM audit_log ${filters.length ? 'WHERE ' + filters.join(' AND ') : ''}
          ORDER BY ts DESC LIMIT ?`,
    args: [...args, limit],
  });

  return NextResponse.json(result.rows.map(r => ({ ...r })));
}
