export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { makeItemHandlers, treatmentRecipesConfig, isNextResponse, requireRequester, getRecipeWithItems } from '@/lib/rest';

const handlers = makeItemHandlers(treatmentRecipesConfig);

// GET devuelve la receta con sus ítems
export const GET = async (request: Request, context: { params: { id: string } }) => {
  const requester = await requireRequester(request);
  if (isNextResponse(requester)) return requester;
  const recipe = await getRecipeWithItems(context.params.id);
  if (!recipe) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (requester.role !== 'super_admin' && recipe.organizationId !== requester.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json(recipe);
};

// PATCH también devuelve la receta con sus ítems, por el mismo motivo que el POST.
export const PATCH = async (request: Request, context: { params: { id: string } }) => {
  const response = await handlers.PATCH(request, context);
  if (response.status >= 400) return response;
  const updated = await response.json();
  return NextResponse.json((await getRecipeWithItems(context.params.id)) ?? updated, { status: response.status });
};

export const DELETE = handlers.DELETE;
