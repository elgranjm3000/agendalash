// Migración: elimina los duplicados de categorías y proveedores que dejó la precarga
// de ensureDb. El INSERT ... SELECT original tenía un NOT EXISTS correlacionado contra la
// misma tabla que insertaba, así que no veía sus propias filas e insertaba una por ítem.
// Uso: node scripts/dedupe-categories-suppliers.mjs
// Conserva la fila más antigua de cada (organización, nombre) y borra el resto.
// Es idempotente: se puede volver a ejecutar sin efectos.
import { db, closeDb } from './pg.mjs';

// (tabla, columna de nombre) — los ítems guardan el nombre como texto, no el id,
// así que borrar duplicados no rompe ninguna referencia.
const TABLES = [
  ['inventory_categories', 'name'],
  ['suppliers', 'name'],
];

for (const [table] of TABLES) {
  const dupes = await db.execute({
    sql: `SELECT "organizationId", lower(name) AS name, count(*) AS n
          FROM ${table}
          GROUP BY "organizationId", lower(name) HAVING count(*) > 1
          ORDER BY lower(name)`,
  });

  if (dupes.rows.length === 0) {
    console.log(`${table}: sin duplicados.`);
    continue;
  }

  console.log(`${table}: ${dupes.rows.length} nombre(s) duplicado(s)`);
  for (const row of dupes.rows) console.log(`   "${row.name}" × ${row.n}`);

  const deleted = await db.execute({
    sql: `DELETE FROM ${table} c
          USING ${table} d
          WHERE c.id <> d.id
            AND c."organizationId" IS NOT DISTINCT FROM d."organizationId"
            AND lower(c.name) = lower(d.name)
            -- Se conserva la fila más antigua; el id desempata (mismo createdAt en las viejas)
            AND (c."createdAt", c.id) > (d."createdAt", d.id)`,
  });
  console.log(`   → ${deleted.rowsAffected} fila(s) eliminada(s)`);
}

for (const [table] of TABLES) {
  const left = await db.execute({
    sql: `SELECT name, count(*) AS n FROM ${table} GROUP BY name ORDER BY lower(name)`,
  });
  console.log(`\n${table} resultante:`);
  for (const row of left.rows) console.log(`  ${row.name} ${row.n > 1 ? `× ${row.n}` : ''}`);
}

await closeDb();
console.log('\nMigración completa.');
