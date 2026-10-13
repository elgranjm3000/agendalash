// Migración: agrega el contenido por unidad de compra a los insumos del inventario.
// Uso: node scripts/add-inventory-pack-size.mjs
//  1. Agrega la columna "packSize" (not null, default 1: unidad de compra = unidad de medida).
//  2. Deduce el contenido de los insumos cuyo nombre lo declara y coincide con su medida
//     ("Permante lash 100ml" + medida ml → 100).
// Es idempotente: se puede volver a ejecutar sin efectos.
import { db, closeDb } from './pg.mjs';

console.log('1. Agregando columna "packSize"…');
// Con DEFAULT para que las inserciones del servidor en vuelo no fallen mientras se despliega.
await db.execute(`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS "packSize" REAL NOT NULL DEFAULT 1`);

console.log('2. Deduciendo el contenido declarado en el nombre…');
const items = await db.execute(`SELECT id, sku, name, unit, "measureUnit", "packSize" FROM inventory_items WHERE "packSize" = 1`);

let inferred = 0;
for (const row of items.rows) {
  const measure = String(row.measureUnit);
  // "100ml", "60 ml", "500g"… siempre que la unidad del nombre sea la medida del insumo,
  // para no confundir el tamaño del frasco con, por ejemplo, el tamaño de la pinza.
  const match = String(row.name).match(new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*${measure}\\b`, 'i'));
  if (!match) continue;
  const packSize = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(packSize) || packSize <= 1) continue;
  await db.execute({ sql: `UPDATE inventory_items SET "packSize" = ? WHERE id = ?`, args: [packSize, row.id] });
  console.log(`   ${row.sku}  ${row.name} → 1 ${row.unit ?? 'envase'} contiene ${packSize} ${measure}`);
  inferred++;
}
if (inferred === 0) console.log('   Nada que deducir.');

const check = await db.execute(`SELECT sku, name, unit, "packSize", "measureUnit", stock, cost FROM inventory_items ORDER BY sku`);
console.log('\nInventario resultante:');
for (const row of check.rows) {
  console.log(
    `  ${row.sku}  ${row.name} — 1 ${row.unit} = ${row.packSize} ${row.measureUnit} · stock: ${row.stock} ${row.measureUnit} · costo por ${row.unit}: ${row.cost}`
  );
}

await closeDb();
console.log('\nMigración completa.');
