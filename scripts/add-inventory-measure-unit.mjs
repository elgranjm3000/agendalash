// Migración: agrega la unidad de medida a los insumos del inventario del salón.
// Uso: node scripts/add-inventory-measure-unit.mjs
//  1. Agrega la columna "measureUnit" (not null, default 'unidad').
//  2. Recupera la medida real de los insumos que la tenían guardada en `unit`.
//  3. Normaliza `unit` (envase) en esos insumos.
// Es idempotente: se puede volver a ejecutar sin efectos.
import { db, closeDb } from './pg.mjs';

// Medidas conocidas: el campo `unit` original mezclaba envase y unidad de medida.
const MEASURES = ['ml', 'l', 'cl', 'cc', 'oz', 'g', 'mg', 'kg', 'unidad', 'par'];
const PLURALS = { unidades: 'unidad', pares: 'par', litros: 'l', gramos: 'g' };
const known = [...MEASURES, ...Object.keys(PLURALS)].map((m) => `'${m}'`).join(', ');

console.log('1. Agregando columna "measureUnit"…');
// Con DEFAULT para que las inserciones del servidor en vuelo no fallen mientras se despliega.
await db.execute(`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS "measureUnit" TEXT NOT NULL DEFAULT 'unidad'`);

console.log('2. Recuperando la unidad de medida de los insumos existentes…');
const cases = Object.entries(PLURALS).map(([from, to]) => `WHEN '${from}' THEN '${to}'`).join('\n          ');
const inferred = await db.execute(
  `UPDATE inventory_items
        SET "measureUnit" = CASE lower(unit)
          ${cases}
          ELSE lower(unit)
        END
        WHERE "measureUnit" = 'unidad' AND lower(unit) IN (${known})`
);
console.log(`   ${inferred.rowsAffected} insumo(s) actualizados.`);

console.log('3. Normalizando el envase (unit) de esos insumos…');
// Si la medida estaba guardada en `unit`, ese campo no describía el envase: se asume frasco.
// Además se unifica el plural "unidades" al singular que ofrece el formulario.
const unitFix = await db.execute(
  `UPDATE inventory_items SET unit = CASE lower(unit)
     WHEN 'unidades' THEN 'unidad'
     WHEN 'ml' THEN 'frasco'
     WHEN 'l' THEN 'frasco'
     WHEN 'cl' THEN 'frasco'
     WHEN 'cc' THEN 'frasco'
     WHEN 'oz' THEN 'frasco'
   END
   WHERE lower(unit) IN ('unidades', 'ml', 'l', 'cl', 'cc', 'oz')`
);
console.log(`   ${unitFix.rowsAffected} insumo(s) quedaron con envase "frasco".`);

const check = await db.execute(`SELECT sku, name, unit, "measureUnit", stock FROM inventory_items ORDER BY sku`);
console.log('\nInventario resultante:');
for (const row of check.rows) {
  console.log(`  ${row.sku}  ${row.name} — envase: ${row.unit} · medida: ${row.measureUnit} · stock: ${row.stock}`);
}

await closeDb();
console.log('\nMigración completa.');
