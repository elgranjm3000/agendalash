export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { isNextResponse, requireRequester } from '@/lib/rest';
import { coverageForOrg, coverageForSupplier } from '@/lib/coverage';

/** GET /api/coverage — proyección de cobertura de insumos.
 *  Salón: cobertura de su stock según sus recetas.
 *  super_admin: añade `supplier` con el rollup de la red (opcionalmente
 *  `?organizationId=` para ver el detalle de un salón específico). */
export async function GET(request: Request) {
  const requester = await requireRequester(request);
  if (isNextResponse(requester)) return requester;
  await ensureDb();

  if (requester.role === 'super_admin') {
    const orgId = new URL(request.url).searchParams.get('organizationId');
    const body: Record<string, unknown> = { supplier: await coverageForSupplier() };
    if (orgId) body.items = await coverageForOrg(orgId);
    return NextResponse.json(body);
  }

  if (!requester.organizationId) {
    return NextResponse.json({ error: 'El usuario no pertenece a ninguna organización' }, { status: 403 });
  }
  return NextResponse.json({ items: await coverageForOrg(requester.organizationId) });
}
