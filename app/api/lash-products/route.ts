export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { makeCollectionHandlers, lashProductsConfig, isNextResponse, requireRequester } from '@/lib/rest';

// El catálogo de insumos (SKU) es global del proveedor: solo super_admin escribe.
const handlers = makeCollectionHandlers(lashProductsConfig);

export const GET = handlers.GET;

export const POST = async (request: Request) => {
  const requester = await requireRequester(request);
  if (isNextResponse(requester)) return requester;
  if (requester.role !== 'super_admin') {
    return NextResponse.json({ error: 'Solo el proveedor puede gestionar el catálogo de insumos' }, { status: 403 });
  }
  return handlers.POST(request);
};
