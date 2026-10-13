// Migra todos los datos de Turso (libSQL) a la base PostgreSQL local.
// Uso: node scripts/migrate-turso-to-pg.mjs
// Idempotente para tablas ya vacías en el destino; las tablas de destino
// deben existir (las crea ensureDb o scripts/schema.sql).
import { createClient } from '@libsql/client';
import { db, closeDb } from './pg.mjs';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const turso = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });

const tables = [
  'organizations', 'users', 'patients', 'appointments', 'prescriptions', 'invoices',
  'medical_records', 'cash_entries', 'inventory_items', 'inventory_categories',
  'suppliers', 'stock_movements', 'lash_products', 'treatment_recipes',
  'recipe_items', 'product_usage', 'audit_log',
];

for (const table of tables) {
  const existing = await db.execute(`SELECT COUNT(*) AS c FROM "${table}"`);
  const destCount = Number(existing.rows[0].c);
  const src = await turso.execute(`SELECT * FROM "${table}"`);
  if (src.rows.length === 0) {
    console.log(`${table}: 0 filas en origen, nada que hacer`);
    continue;
  }
  if (destCount > 0) {
    console.log(`${table}: destino ya tiene ${destCount} filas, se omite (borrá-la primero si querés re-migrar)`);
    continue;
  }
  const columns = Object.keys(src.rows[0]);
  const colList = columns.map((c) => `"${c}"`).join(', ');
  const BATCH = 200;
  let inserted = 0;
  for (let offset = 0; offset < src.rows.length; offset += BATCH) {
    const chunk = src.rows.slice(offset, offset + BATCH);
    const statements = chunk.map((row) => ({
      sql: `INSERT INTO "${table}" (${colList}) VALUES (${columns.map(() => '?').join(', ')})`,
      args: columns.map((c) => row[c] ?? null),
    }));
    await db.batch(statements);
    inserted += chunk.length;
  }
  console.log(`${table}: ${inserted} filas migradas`);
}

await turso.close();
await closeDb();
console.log('Migración completa.');
