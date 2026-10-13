export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { db, ensureDb } from '@/lib/db';
import { makeCollectionHandlers, treatmentRecipesConfig, isNextResponse, requireRequester, getRecipeWithItems } from '@/lib/rest';

const { POST: createRecipe } = makeCollectionHandlers(treatmentRecipesConfig);

// POST devuelve la receta completa (con sus ítems): el cliente reemplaza la lista con
// esta respuesta, y una receta sin `items` rompe el render de la página de recetas.
export const POST = async (request: Request) => {
  const response = await createRecipe(request);
  if (response.status >= 400) return response;
  const created = await response.json();
  if (!created?.id) return NextResponse.json(created, { status: response.status });
  return NextResponse.json((await getRecipeWithItems(String(created.id))) ?? created, { status: response.status });
};

// GET lista las recetas del salón junto con sus ítems
export const GET = async (request: Request) => {
  const requester = await requireRequester(request);
  if (isNextResponse(requester)) return requester;
  await ensureDb();

  const orgId = requester.role === 'super_admin'
    ? new URL(request.url).searchParams.get('organizationId') ?? requester.organizationId
    : requester.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: 'El usuario no pertenece a ninguna organización' }, { status: 403 });
  }
  const result = await db.execute({
    sql: `SELECT id, name, "servicesPerWeek", active, "createdAt", "updatedAt"
          FROM treatment_recipes WHERE "organizationId" = ? ORDER BY "createdAt" DESC`,
    args: [orgId],
  });
  const recipes = [];
  for (const row of result.rows) {
    const recipe = await getRecipeWithItems(row.id as string);
    if (recipe) recipes.push(recipe);
  }
  return NextResponse.json(recipes);
};

