// Cliente de PostgreSQL para scripts auxiliares, con la misma interfaz
// (execute/batch, placeholders `?`) que tenía el cliente de Turso/libSQL.
import pg from 'pg';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });

function toPgSql(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

async function execute(sqlOrStatement, args) {
  const sql = typeof sqlOrStatement === 'string' ? sqlOrStatement : sqlOrStatement.sql;
  const params = args ?? (typeof sqlOrStatement === 'string' ? [] : sqlOrStatement.args ?? []);
  const result = await pool.query(toPgSql(sql), params);
  return { rows: result.rows, rowsAffected: result.rowCount ?? 0 };
}

async function batch(statements) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const results = [];
    for (const statement of statements) {
      const sql = typeof statement === 'string' ? statement : statement.sql;
      const params = typeof statement === 'string' ? [] : statement.args ?? [];
      const result = await client.query(toPgSql(sql), params);
      results.push({ rows: result.rows, rowsAffected: result.rowCount ?? 0 });
    }
    await client.query('COMMIT');
    return results;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export const db = { execute, batch };
export function closeDb() {
  return pool.end();
}
