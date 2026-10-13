import pg from 'pg';
import bcrypt from 'bcryptjs';

/** Valores aceptados como parámetros de consulta (compatible con el cliente anterior). */
export type InValue = string | number | boolean | null | Uint8Array | bigint;

export interface DbRow {
  [key: string]: unknown;
}

export interface DbResult {
  rows: DbRow[];
  rowsAffected: number;
}

export interface SqlStatement {
  sql: string;
  args?: InValue[];
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

/** Convierte placeholders `?` al estilo `$n` de PostgreSQL. */
function toPgSql(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

/**
 * Cliente de base de datos sobre PostgreSQL con la misma interfaz que usaba
 * el cliente de Turso/libSQL: `db.execute({ sql, args })`, `db.execute(sql, args)`
 * y `db.batch([...])`. Devuelve `{ rows, rowsAffected }`.
 */
export const db = {
  async execute(sqlOrStatement: string | SqlStatement, args?: InValue[]): Promise<DbResult> {
    const sql = typeof sqlOrStatement === 'string' ? sqlOrStatement : sqlOrStatement.sql;
    const params = args ?? (typeof sqlOrStatement === 'string' ? [] : sqlOrStatement.args ?? []);
    const result = await pool.query(toPgSql(sql), params as unknown[]);
    return { rows: result.rows as DbRow[], rowsAffected: result.rowCount ?? 0 };
  },

  /** Ejecuta las sentencias en una transacción: si una falla, se revierte todo. */
  async batch(statements: (string | SqlStatement)[]): Promise<DbResult[]> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const results: DbResult[] = [];
      for (const statement of statements) {
        const sql = typeof statement === 'string' ? statement : statement.sql;
        const params = typeof statement === 'string' ? [] : statement.args ?? [];
        const result = await client.query(toPgSql(sql), params as unknown[]);
        results.push({ rows: result.rows as DbRow[], rowsAffected: result.rowCount ?? 0 });
      }
      await client.query('COMMIT');
      return results;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },
};

let initPromise: Promise<void> | null = null;

export function ensureDb(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await db.batch([
        // Esquema completo (incluye columnas agregadas históricamente vía ALTER):
        // los booleanos se guardan como INTEGER (0/1) y las fechas como TEXT ISO,
        // igual que en el esquema original, para no cambiar la lógica de la app.
        `CREATE TABLE IF NOT EXISTS organizations (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          "isActive" INTEGER NOT NULL DEFAULT 1,
          currency TEXT DEFAULT 'USD',
          "trialEndsAt" TEXT,
          logo TEXT,
          "lastTrialNotice" TEXT,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          "firstName" TEXT NOT NULL,
          "lastName" TEXT NOT NULL,
          role TEXT NOT NULL,
          "organizationId" TEXT,
          "isActive" INTEGER NOT NULL DEFAULT 1,
          avatar TEXT,
          signature TEXT,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS patients (
          id TEXT PRIMARY KEY,
          "organizationId" TEXT,
          "firstName" TEXT NOT NULL,
          "lastName" TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT NOT NULL,
          "dateOfBirth" TEXT NOT NULL,
          address TEXT NOT NULL,
          "emergencyContact" TEXT NOT NULL,
          "emergencyPhone" TEXT NOT NULL,
          "medicalHistory" TEXT,
          "insuranceInfo" TEXT,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS appointments (
          id TEXT PRIMARY KEY,
          "organizationId" TEXT,
          "patientId" TEXT NOT NULL,
          "patientName" TEXT NOT NULL,
          "doctorId" TEXT NOT NULL,
          "doctorName" TEXT NOT NULL,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          duration INTEGER NOT NULL,
          type TEXT NOT NULL,
          status TEXT NOT NULL,
          notes TEXT,
          "recipeId" TEXT,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS prescriptions (
          id TEXT PRIMARY KEY,
          "organizationId" TEXT,
          "patientId" TEXT NOT NULL,
          "patientName" TEXT NOT NULL,
          "doctorId" TEXT NOT NULL,
          "doctorName" TEXT NOT NULL,
          "appointmentId" TEXT,
          "recordId" TEXT,
          medications TEXT NOT NULL,
          diagnosis TEXT NOT NULL,
          instructions TEXT NOT NULL,
          status TEXT NOT NULL,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS invoices (
          id TEXT PRIMARY KEY,
          "organizationId" TEXT,
          "patientId" TEXT NOT NULL,
          "patientName" TEXT NOT NULL,
          "appointmentId" TEXT,
          items TEXT NOT NULL,
          subtotal REAL NOT NULL,
          tax REAL NOT NULL,
          total REAL NOT NULL,
          status TEXT NOT NULL,
          "dueDate" TEXT NOT NULL,
          "paidDate" TEXT,
          "paymentMethod" TEXT,
          notes TEXT,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS audit_log (
          id TEXT PRIMARY KEY,
          ts TEXT NOT NULL,
          "userId" TEXT,
          "userEmail" TEXT,
          "userName" TEXT,
          "organizationId" TEXT,
          action TEXT NOT NULL,
          entity TEXT,
          "entityId" TEXT,
          detail TEXT,
          ip TEXT
        )`,
        `CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log ("ts" DESC)`,
        `CREATE TABLE IF NOT EXISTS medical_records (
          id TEXT PRIMARY KEY,
          "organizationId" TEXT,
          "patientId" TEXT NOT NULL,
          "patientName" TEXT NOT NULL,
          "doctorId" TEXT NOT NULL,
          "doctorName" TEXT NOT NULL,
          date TEXT NOT NULL,
          status TEXT DEFAULT 'completada',
          "triageLevel" TEXT,
          motivo TEXT,
          "enfermedadActual" TEXT,
          "bloodPressure" TEXT,
          "heartRate" INTEGER,
          temperature REAL,
          weight REAL,
          height REAL,
          "oxygenSat" INTEGER,
          diagnostico TEXT,
          indicaciones TEXT,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL
        )`,
        `CREATE INDEX IF NOT EXISTS idx_records_patient ON medical_records ("patientId", date DESC)`,
        `CREATE TABLE IF NOT EXISTS cash_entries (
          id TEXT PRIMARY KEY,
          "organizationId" TEXT,
          type TEXT NOT NULL,
          concept TEXT NOT NULL,
          amount REAL NOT NULL,
          method TEXT NOT NULL,
          "patientId" TEXT,
          "patientName" TEXT,
          date TEXT NOT NULL,
          "registeredBy" TEXT,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL
        )`,
        `CREATE INDEX IF NOT EXISTS idx_cash_date ON cash_entries (date DESC)`,
        `CREATE TABLE IF NOT EXISTS inventory_items (
          id TEXT PRIMARY KEY,
          "organizationId" TEXT,
          sku TEXT NOT NULL,
          name TEXT NOT NULL,
          category TEXT,
          unit TEXT NOT NULL,
          "packSize" REAL NOT NULL DEFAULT 1,
          "measureUnit" TEXT NOT NULL DEFAULT 'unidad',
          stock REAL NOT NULL DEFAULT 0,
          "minStock" REAL NOT NULL DEFAULT 0,
          cost REAL,
          supplier TEXT,
          "deductOnConsult" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL
        )`,
        // El SKU identifica el insumo dentro del salón (dos salones pueden repetirlo)
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items ("organizationId", lower(sku))`,
        `CREATE TABLE IF NOT EXISTS inventory_categories (
          id TEXT PRIMARY KEY,
          "organizationId" TEXT,
          name TEXT NOT NULL,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL
        )`,
        // Un nombre por organización: sin este índice la precarga (y la UI) podían duplicarlos
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_categories_name ON inventory_categories ("organizationId", lower(name))`,
        `CREATE TABLE IF NOT EXISTS suppliers (
          id TEXT PRIMARY KEY,
          "organizationId" TEXT,
          name TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL
        )`,
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers ("organizationId", lower(name))`,
        `CREATE TABLE IF NOT EXISTS stock_movements (
          id TEXT PRIMARY KEY,
          "organizationId" TEXT,
          "itemId" TEXT NOT NULL,
          "itemName" TEXT NOT NULL,
          type TEXT NOT NULL,
          quantity REAL NOT NULL,
          reason TEXT,
          date TEXT NOT NULL,
          "registeredBy" TEXT,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS lash_products (
          id TEXT PRIMARY KEY,
          sku TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          unit TEXT NOT NULL,
          stock REAL NOT NULL DEFAULT 0,
          "minStock" REAL NOT NULL DEFAULT 0,
          cost REAL,
          supplier TEXT,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS treatment_recipes (
          id TEXT PRIMARY KEY,
          "organizationId" TEXT,
          name TEXT NOT NULL,
          "servicesPerWeek" REAL NOT NULL DEFAULT 0,
          active INTEGER NOT NULL DEFAULT 1,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS recipe_items (
          id TEXT PRIMARY KEY,
          "recipeId" TEXT NOT NULL,
          "inventoryItemId" TEXT,
          "productId" TEXT,
          "quantityPerService" REAL NOT NULL,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL
        )`,
        `CREATE INDEX IF NOT EXISTS idx_recipe_items_recipe ON recipe_items ("recipeId")`,
        `CREATE TABLE IF NOT EXISTS product_usage (
          id TEXT PRIMARY KEY,
          "organizationId" TEXT,
          "inventoryItemId" TEXT,
          "productId" TEXT,
          "recipeId" TEXT,
          "appointmentId" TEXT,
          quantity REAL NOT NULL,
          date TEXT NOT NULL,
          "createdAt" TEXT NOT NULL
        )`,
        `CREATE INDEX IF NOT EXISTS idx_usage_org_date ON product_usage ("organizationId", "date" DESC)`,
      ]);

      // Migración de datos: org por defecto + roles
      const now = new Date().toISOString();
      // Precarga: categorías ya usadas en ítems existentes.
      // El DISTINCT ON no es opcional: el NOT EXISTS se evalúa contra la foto previa a la
      // sentencia, así que sin él cada ítem con la misma categoría insertaría su propia fila.
      await db.execute(`INSERT INTO inventory_categories (id, "organizationId", name, "createdAt", "updatedAt")
        SELECT md5(random()::text || clock_timestamp()::text), src."organizationId", src.name, ?, ?
        FROM (
          SELECT DISTINCT ON (i."organizationId", lower(i.category)) i."organizationId", i.category AS name
          FROM inventory_items i
          WHERE i.category IS NOT NULL AND i.category != ''
          ORDER BY i."organizationId", lower(i.category), i.category
        ) src
        WHERE NOT EXISTS (
          SELECT 1 FROM inventory_categories c
          WHERE c."organizationId" IS NOT DISTINCT FROM src."organizationId" AND lower(c.name) = lower(src.name)
        )`, [now, now]);
      // Precarga: proveedores ya usados en ítems existentes (mismo caso)
      await db.execute(`INSERT INTO suppliers (id, "organizationId", name, "createdAt", "updatedAt")
        SELECT md5(random()::text || clock_timestamp()::text), src."organizationId", src.name, ?, ?
        FROM (
          SELECT DISTINCT ON (i."organizationId", lower(i.supplier)) i."organizationId", i.supplier AS name
          FROM inventory_items i
          WHERE i.supplier IS NOT NULL AND i.supplier != ''
          ORDER BY i."organizationId", lower(i.supplier), i.supplier
        ) src
        WHERE NOT EXISTS (
          SELECT 1 FROM suppliers s
          WHERE s."organizationId" IS NOT DISTINCT FROM src."organizationId" AND lower(s.name) = lower(src.name)
        )`, [now, now]);
      const orgResult = await db.execute('SELECT id FROM organizations LIMIT 1');
      let defaultOrgId: string;
      if (orgResult.rows.length === 0) {
        defaultOrgId = crypto.randomUUID();
        await db.execute({
          sql: `INSERT INTO organizations (id, name, type, "isActive", "createdAt", "updatedAt")
                VALUES (?, ?, 'clinic', 1, ?, ?)`,
          args: [defaultOrgId, 'Clínica Central', now, now],
        });
      } else {
        defaultOrgId = orgResult.rows[0].id as string;
      }

      // Usuarios sin organización (creados pre-SaaS) → org por defecto
      await db.execute({
        sql: `UPDATE users SET "organizationId" = ? WHERE "organizationId" IS NULL AND role != 'super_admin'`,
        args: [defaultOrgId],
      });

      // El admin original se convierte en super admin de la plataforma
      await db.execute({
        sql: `UPDATE users SET role = 'super_admin', "organizationId" = NULL, "updatedAt" = ? WHERE email = 'admin@medicontrol.com' AND role = 'admin'`,
        args: [now],
      });

      // Seed inicial: doctor por defecto si no hay usuarios
      const userCount = await db.execute('SELECT COUNT(*) as count FROM users');
      if (Number(userCount.rows[0].count) === 0) {
        const adminHash = await bcrypt.hash('admin123', 10);
        const doctorHash = await bcrypt.hash('doctor123', 10);
        await db.batch([
          {
            sql: `INSERT INTO users (id, email, password_hash, "firstName", "lastName", role, "organizationId", "isActive", "createdAt", "updatedAt")
                  VALUES (?, ?, ?, ?, ?, 'super_admin', NULL, 1, ?, ?)`,
            args: [crypto.randomUUID(), 'admin@medicontrol.com', adminHash, 'Admin', 'Sistema', now, now],
          },
          {
            sql: `INSERT INTO users (id, email, password_hash, "firstName", "lastName", role, "organizationId", "isActive", "createdAt", "updatedAt")
                  VALUES (?, ?, ?, ?, ?, 'doctor', ?, 1, ?, ?)`,
            args: [crypto.randomUUID(), 'doctor@medicontrol.com', doctorHash, 'Dr. Juan', 'Pérez', defaultOrgId, now, now],
          },
        ]);
      }
    })();
  }
  return initPromise;
}
