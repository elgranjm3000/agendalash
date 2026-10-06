import { db } from './db';

export interface DeductWarning {
  item: string;
  reason: 'no_existe' | 'stock_insuficiente';
  available?: number;
}

/** Registra la salida en stock_movements y ajusta el stock del ítem. */
async function registerExit(
  orgId: string,
  item: { id: string; name: string; stock: number; unit: string },
  quantity: number,
  reason: string,
  by: string
) {
  const now = new Date().toISOString();
  await db.execute({
    sql: `INSERT INTO stock_movements (id, "organizationId", "itemId", "itemName", type, quantity, reason, date, "registeredBy", "createdAt", "updatedAt")
          VALUES (?, ?, ?, ?, 'salida', ?, ?, ?, ?, ?, ?)`,
    args: [crypto.randomUUID(), orgId, item.id, item.name, quantity, reason, now.slice(0, 10), by, now, now],
  });
  await db.execute({
    sql: `UPDATE inventory_items SET stock = stock - ?, "updatedAt" = ? WHERE id = ?`,
    args: [quantity, now, item.id],
  });
}

/** Descuenta quantity unidades del ítem cuyo nombre coincida (insensible a mayúsculas). */
export async function deductByName(
  orgId: string,
  name: string,
  quantity: number,
  reason: string,
  by: string
): Promise<DeductWarning | null> {
  const result = await db.execute({
    sql: `SELECT id, name, stock, unit FROM inventory_items
          WHERE "organizationId" = ? AND lower(name) = lower(?) LIMIT 1`,
    args: [orgId, name],
  });
  if (result.rows.length === 0) {
    return { item: name, reason: 'no_existe' };
  }
  const stock = Number(result.rows[0].stock);
  if (stock < quantity) {
    return { item: name, reason: 'stock_insuficiente', available: stock };
  }
  await registerExit(
    orgId,
    { id: result.rows[0].id as string, name: result.rows[0].name as string, stock, unit: result.rows[0].unit as string },
    quantity,
    reason,
    by
  );
  return null;
}

/** Descuenta el consumo de una receta de tratamiento (por id de ítem, no por nombre). */
export async function deductRecipe(
  orgId: string,
  recipeId: string,
  appointmentId: string | null,
  reason: string,
  by: string
): Promise<DeductWarning[]> {
  const items = await db.execute({
    sql: `SELECT ri."inventoryItemId", ri."productId", ri."quantityPerService",
                 i.name, i.stock
          FROM recipe_items ri
          LEFT JOIN inventory_items i ON i.id = ri."inventoryItemId"
          WHERE ri."recipeId" = ?`,
    args: [recipeId],
  });
  const now = new Date().toISOString();
  const warnings: DeductWarning[] = [];
  for (const row of items.rows) {
    const qty = Number(row.quantityPerService);
    const itemId = row.inventoryItemId as string | null;
    const name = (row.name as string) ?? (itemId ?? 'insumo');
    if (!itemId) {
      warnings.push({ item: name, reason: 'no_existe' });
      continue;
    }
    const stock = Number(row.stock ?? 0);
    if (stock < qty) {
      warnings.push({ item: name, reason: 'stock_insuficiente', available: stock });
      continue;
    }
    await registerExit(orgId, { id: itemId, name, stock, unit: '' }, qty, reason, by);
    await db.execute({
      sql: `INSERT INTO product_usage (id, "organizationId", "inventoryItemId", "productId", "recipeId", "appointmentId", quantity, date, "createdAt")
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), orgId, itemId, row.productId as string | null, recipeId, appointmentId, qty, now.slice(0, 10), now],
    });
  }
  return warnings;
}

/** Descuenta 1 unidad de cada ítem marcado como consumible de consulta. */
export async function deductConsultConsumables(
  orgId: string,
  reason: string,
  by: string
): Promise<DeductWarning[]> {
  const items = await db.execute({
    sql: `SELECT id, name, stock, unit FROM inventory_items
          WHERE "organizationId" = ? AND "deductOnConsult" = 1 AND stock > 0`,
    args: [orgId],
  });
  const warnings: DeductWarning[] = [];
  for (const row of items.rows) {
    await registerExit(
      orgId,
      { id: row.id as string, name: row.name as string, stock: Number(row.stock), unit: row.unit as string },
      1,
      reason,
      by
    );
  }
  return warnings;
}
