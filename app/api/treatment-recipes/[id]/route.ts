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

export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
