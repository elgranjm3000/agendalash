export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { makeItemHandlers, lashProductsConfig, isNextResponse, requireRequester } from '@/lib/rest';

// El catálogo de insumos (SKU) es global del proveedor: solo super_admin escribe.
const handlers = makeItemHandlers(lashProductsConfig);

export const GET = handlers.GET;

export const PATCH = async (request: Request, context: { params: { id: string } }) => {
  const requester = await requireRequester(request);
  if (isNextResponse(requester)) return requester;
  if (requester.role !== 'super_admin') {
    return NextResponse.json({ error: 'Solo el proveedor puede gestionar el catálogo de insumos' }, { status: 403 });
  }
  return handlers.PATCH(request, context);
};

export const DELETE = async (request: Request, context: { params: { id: string } }) => {
  const requester = await requireRequester(request);
  if (isNextResponse(requester)) return requester;
  if (requester.role !== 'super_admin') {
    return NextResponse.json({ error: 'Solo el proveedor puede gestionar el catálogo de insumos' }, { status: 403 });
  }
  return handlers.DELETE(request, context);
};
