// Migración: agrega el SKU obligatorio a los insumos del inventario del salón.
// Uso: node scripts/add-inventory-sku.mjs
//  1. Agrega la columna `sku` a inventory_items.
//  2. Rellena los insumos existentes con SKU-0001, SKU-0002… por organización.
//  3. Aplica NOT NULL y el índice único ("organizationId", lower(sku)).
// Es idempotente: se puede volver a ejecutar sin efectos.
import { db, closeDb } from './pg.mjs';

const code = (n) => `SKU-${String(n).padStart(4, '0')}`;

console.log('1. Agregando columna sku…');
await db.execute(`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS sku TEXT`);

console.log('2. Rellenando insumos sin SKU…');
const pending = await db.execute({
  sql: `SELECT id, "organizationId" FROM inventory_items
        WHERE sku IS NULL OR sku = ''
        ORDER BY "organizationId", "createdAt", id`,
});

if (pending.rows.length === 0) {
  console.log('   Nada que rellenar.');
} else {
  // SKUs ya en uso por organización (comparados en minúsculas, como el índice único)
  const used = new Map();
  const known = await db.execute(`SELECT DISTINCT "organizationId", lower(sku) AS sku FROM inventory_items WHERE sku IS NOT NULL AND sku != ''`);
  for (const row of known.rows) {
    const key = String(row.organizationId);
    if (!used.has(key)) used.set(key, new Set());
    used.get(key).add(row.sku);
  }

  for (const row of pending.rows) {
    const key = String(row.organizationId);
    if (!used.has(key)) used.set(key, new Set());
    const taken = used.get(key);
    let n = 1;
    while (taken.has(code(n).toLowerCase())) n++;
    const sku = code(n);
    taken.add(sku.toLowerCase());
    await db.execute({ sql: `UPDATE inventory_items SET sku = ? WHERE id = ?`, args: [sku, row.id] });
    console.log(`   ${row.id.slice(0, 8)} → ${sku}`);
  }
}

console.log('3. Aplicando NOT NULL…');
await db.execute(`ALTER TABLE inventory_items ALTER COLUMN sku SET NOT NULL`);

console.log('4. Creando índice único por organización…');
await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items ("organizationId", lower(sku))`);

const check = await db.execute(`SELECT sku, name FROM inventory_items ORDER BY sku`);
console.log('\nInventario resultante:');
for (const row of check.rows) console.log(`  ${row.sku}  ${row.name}`);

await closeDb();
console.log('\nMigración completa.');
