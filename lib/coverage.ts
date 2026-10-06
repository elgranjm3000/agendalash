import { db } from './db';

export interface CoverageRow {
  /** Insumo del salón (inventory_items) */
  itemId: string;
  name: string;
  unit: string;
  stock: number;
  /** SKU del proveedor vinculado, si existe */
  productId: string | null;
  sku: string | null;
  /** Consumo proyectado por semana (unidades del insumo) */
  weeklyUsage: number;
  /** Sesiones cubiertas con el stock actual */
  sessionsCovered: number;
  /** Días restantes de stock al ritmo proyectado (null = sin uso proyectado) */
  coverageDays: number | null;
  thresholdDays: number;
  level: 'ok' | 'warn' | 'critical';
}

export const COVERAGE_THRESHOLD_DAYS = 7;

/**
 * Proyección de cobertura por insumo para un salón:
 * usoSemanal = Σ (quantityPerService × servicesPerWeek) sobre recetas activas.
 * Para super_admin, además del detalle del salón se puede consultar el
 * rollup global del proveedor (ver coverageForSupplier).
 */
export async function coverageForOrg(orgId: string): Promise<CoverageRow[]> {
  // Stock por insumo del salón
  const items = await db.execute({
    sql: `SELECT id, name, unit, stock, "minStock" FROM inventory_items WHERE "organizationId" = ?`,
    args: [orgId],
  });
  // Uso proyectado por insumo: recetas activas del salón
  const usage = await db.execute({
    sql: `SELECT ri."inventoryItemId" AS "itemId",
                 SUM(ri."quantityPerService" * r."servicesPerWeek") AS weekly,
                 SUM(ri."quantityPerService") AS perService
          FROM recipe_items ri
          JOIN treatment_recipes r ON r.id = ri."recipeId"
          WHERE r."organizationId" = ? AND r.active = 1 AND ri."inventoryItemId" IS NOT NULL
          GROUP BY ri."inventoryItemId"`,
    args: [orgId],
  });
  // Links insumo → SKU del catálogo del proveedor (vía recetas que declaren productId)
  const links = await db.execute({
    sql: `SELECT DISTINCT ri."inventoryItemId" AS "itemId", p.id AS "productId", p.sku
          FROM recipe_items ri
          JOIN treatment_recipes r ON r.id = ri."recipeId"
          JOIN lash_products p ON p.id = ri."productId"
          WHERE r."organizationId" = ? AND ri."inventoryItemId" IS NOT NULL`,
    args: [orgId],
  });

  const usageByItem = new Map(usage.rows.map(r => [r.itemId as string, { weekly: Number(r.weekly ?? 0), perService: Number(r.perService ?? 0) }]));
  const linkByItem = new Map(links.rows.map(r => [r.itemId as string, { productId: r.productId as string, sku: r.sku as string }]));

  const rows: CoverageRow[] = items.rows.map(row => {
    const itemId = row.id as string;
    const stock = Number(row.stock ?? 0);
    const u = usageByItem.get(itemId);
    const link = linkByItem.get(itemId) ?? null;
    const weeklyUsage = u?.weekly ?? 0;
    const dailyUsage = weeklyUsage / 7;
    const coverageDays = dailyUsage > 0 ? stock / dailyUsage : null;
    const sessionsCovered = u && u.perService > 0 ? stock / u.perService : null;
    const level: CoverageRow['level'] =
      coverageDays === null ? 'ok' : coverageDays <= 3 ? 'critical' : coverageDays <= COVERAGE_THRESHOLD_DAYS ? 'warn' : 'ok';
    return {
      itemId,
      name: row.name as string,
      unit: row.unit as string,
      stock,
      productId: link?.productId ?? null,
      sku: link?.sku ?? null,
      weeklyUsage,
      sessionsCovered: sessionsCovered ?? 0,
      coverageDays,
      thresholdDays: COVERAGE_THRESHOLD_DAYS,
      level,
    };
  });

  // Los insumos con uso proyectado primero; dentro de cada grupo, el más crítico
  return rows.sort((a, b) => {
    const ac = a.coverageDays ?? Infinity;
    const bc = b.coverageDays ?? Infinity;
    if (a.coverageDays === null && b.coverageDays !== null) return 1;
    if (b.coverageDays === null && a.coverageDays !== null) return -1;
    return ac - bc;
  });
}

export interface SupplierRollupRow {
  productId: string;
  sku: string;
  name: string;
  unit: string;
  stock: number;
  minStock: number;
  /** Consumo semanal de todos los salones que usan este SKU */
  networkWeeklyUsage: number;
  /** Días de stock en depósito al ritmo de consumo de la red */
  coverageDays: number | null;
}

/** Rollup para el proveedor (super_admin): consumo de la red vs stock en depósito. */
export async function coverageForSupplier(): Promise<SupplierRollupRow[]> {
  const products = await db.execute(
    `SELECT id, sku, name, unit, stock, "minStock" FROM lash_products ORDER BY sku`
  );
  const usage = await db.execute(
    `SELECT ri."productId" AS "productId",
            SUM(ri."quantityPerService" * r."servicesPerWeek") AS weekly
     FROM recipe_items ri
     JOIN treatment_recipes r ON r.id = ri."recipeId"
     WHERE r.active = 1 AND ri."productId" IS NOT NULL
     GROUP BY ri."productId"`
  );
  const usageByProduct = new Map(usage.rows.map(r => [r.productId as string, Number(r.weekly ?? 0)]));

  return products.rows.map(row => {
    const stock = Number(row.stock ?? 0);
    const weekly = usageByProduct.get(row.id as string) ?? 0;
    const daily = weekly / 7;
    return {
      productId: row.id as string,
      sku: row.sku as string,
      name: row.name as string,
      unit: row.unit as string,
      stock,
      minStock: Number(row.minStock ?? 0),
      networkWeeklyUsage: weekly,
      coverageDays: daily > 0 ? stock / daily : null,
    };
  });
}
