import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

let initPromise: Promise<void> | null = null;

export function ensureDb(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await db.batch([
        `CREATE TABLE IF NOT EXISTS organizations (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          "isActive" INTEGER NOT NULL DEFAULT 1,
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
      ]);

      // Migración: agregar organizationId a tablas creadas antes del modelo multi-tenant
      const tenantTables = ['users', 'patients', 'appointments', 'prescriptions', 'invoices'];
      for (const table of tenantTables) {
        try {
          await db.execute(`ALTER TABLE "${table}" ADD COLUMN "organizationId" TEXT`);
        } catch {
          // la columna ya existe
        }
      }

      // Migración: avatar de perfil (data URL de imagen redimensionada en el cliente)
      try {
        await db.execute(`ALTER TABLE users ADD COLUMN avatar TEXT`);
      } catch {
        // la columna ya existe
      }

      // Migración: firma digital del doctor (data URL, se estampa en recetas)
      try {
        await db.execute(`ALTER TABLE users ADD COLUMN signature TEXT`);
      } catch {
        // la columna ya existe
      }

      // Migración: moneda por organización (código ISO: USD, EUR, MXN, ...)
      try {
        await db.execute(`ALTER TABLE organizations ADD COLUMN currency TEXT`);
      } catch {
        // la columna ya existe
      }
      await db.execute(`UPDATE organizations SET currency = 'USD' WHERE currency IS NULL`);

      // Trazabilidad: receta emitida desde una consulta de la HCE
      try {
        await db.execute(`ALTER TABLE prescriptions ADD COLUMN "recordId" TEXT`);
      } catch {
        // la columna ya existe
      }

      // Prueba gratuita de 7 días: fecha de vencimiento; NULL = licencia activa
      try {
        await db.execute(`ALTER TABLE organizations ADD COLUMN "trialEndsAt" TEXT`);
      } catch {
        // la columna ya existe
      }
      // Logo de la organización (data URL, en documentos impresos)
      try {
        await db.execute(`ALTER TABLE organizations ADD COLUMN logo TEXT`);
      } catch {
        // la columna ya existe
      }
      // Último aviso de trial enviado (YYYY-MM-DD) para no duplicar emails
      try {
        await db.execute(`ALTER TABLE organizations ADD COLUMN "lastTrialNotice" TEXT`);
      } catch {
        // la columna ya existe
      }
      // Consumible de consulta: se descuenta 1 unidad al completar una cita
      try {
        await db.execute(`ALTER TABLE inventory_items ADD COLUMN "deductOnConsult" INTEGER NOT NULL DEFAULT 0`);
      } catch {
        // la columna ya existe
      }

      // Log de auditoría: sesiones y operaciones por usuario
      await db.execute(`CREATE TABLE IF NOT EXISTS audit_log (
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
      )`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log ("ts" DESC)`);

      // Historia Clínica Electrónica: episodios de consulta con signos vitales
      await db.execute(`CREATE TABLE IF NOT EXISTS medical_records (
        id TEXT PRIMARY KEY,
        "organizationId" TEXT,
        "patientId" TEXT NOT NULL,
        "patientName" TEXT NOT NULL,
        "doctorId" TEXT NOT NULL,
        "doctorName" TEXT NOT NULL,
        date TEXT NOT NULL,
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
      )`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_records_patient ON medical_records ("patientId", date DESC)`);

      // Triaje: estado del episodio y nivel de urgencia (tablas preexistentes)
      try {
        await db.execute(`ALTER TABLE medical_records ADD COLUMN status TEXT`);
        await db.execute(`UPDATE medical_records SET status = 'completada' WHERE status IS NULL`);
      } catch {
        // la columna ya existe
      }
      try {
        await db.execute(`ALTER TABLE medical_records ADD COLUMN "triageLevel" TEXT`);
      } catch {
        // la columna ya existe
      }

      // Caja diaria: ingresos y egresos
      await db.execute(`CREATE TABLE IF NOT EXISTS cash_entries (
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
      )`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_cash_date ON cash_entries (date DESC)`);

      // Inventario de insumos
      await db.execute(`CREATE TABLE IF NOT EXISTS inventory_items (
        id TEXT PRIMARY KEY,
        "organizationId" TEXT,
        name TEXT NOT NULL,
        category TEXT,
        unit TEXT NOT NULL,
        stock REAL NOT NULL DEFAULT 0,
        "minStock" REAL NOT NULL DEFAULT 0,
        cost REAL,
        supplier TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      )`);

      // Categorías del inventario por organización
      await db.execute(`CREATE TABLE IF NOT EXISTS inventory_categories (
        id TEXT PRIMARY KEY,
        "organizationId" TEXT,
        name TEXT NOT NULL,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      )`);

      // Proveedores por organización
      await db.execute(`CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        "organizationId" TEXT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      )`);

      await db.execute(`CREATE TABLE IF NOT EXISTS stock_movements (
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
      )`);

      // Receta de tratamiento asociada a la cita (para descontar insumos al completarla)
      try {
        await db.execute(`ALTER TABLE appointments ADD COLUMN "recipeId" TEXT`);
      } catch {
        // la columna ya existe
      }

      // Catálogo global de insumos de pestañas (SKU del proveedor / dueño del SaaS)
      await db.execute(`CREATE TABLE IF NOT EXISTS lash_products (
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
      )`);

      // Recetas de tratamiento: cuánto consume cada servicio del salón
      await db.execute(`CREATE TABLE IF NOT EXISTS treatment_recipes (
        id TEXT PRIMARY KEY,
        "organizationId" TEXT,
        name TEXT NOT NULL,
        "servicesPerWeek" REAL NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      )`);

      // Ítems de una receta: insumo del salón + link opcional al SKU del proveedor
      await db.execute(`CREATE TABLE IF NOT EXISTS recipe_items (
        id TEXT PRIMARY KEY,
        "recipeId" TEXT NOT NULL,
        "inventoryItemId" TEXT,
        "productId" TEXT,
        "quantityPerService" REAL NOT NULL,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      )`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_recipe_items_recipe ON recipe_items ("recipeId")`);

      // Consumo real por servicio (refina la proyección de cobertura en V2)
      await db.execute(`CREATE TABLE IF NOT EXISTS product_usage (
        id TEXT PRIMARY KEY,
        "organizationId" TEXT,
        "inventoryItemId" TEXT,
        "productId" TEXT,
        "recipeId" TEXT,
        "appointmentId" TEXT,
        quantity REAL NOT NULL,
        date TEXT NOT NULL,
        "createdAt" TEXT NOT NULL
      )`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_usage_org_date ON product_usage ("organizationId", "date" DESC)`);

      // Migración de datos: org por defecto + roles
      const now = new Date().toISOString();
      // Precarga: categorías ya usadas en ítems existentes
      await db.execute(`INSERT INTO inventory_categories (id, "organizationId", name, "createdAt", "updatedAt")
        SELECT lower(hex(randomblob(16))), i."organizationId", i.category, ?, ?
        FROM inventory_items i
        WHERE i.category IS NOT NULL AND i.category != ''
          AND NOT EXISTS (
            SELECT 1 FROM inventory_categories c
            WHERE c."organizationId" IS i."organizationId" AND lower(c.name) = lower(i.category)
          )`, [now, now]);
      // Precarga: proveedores ya usados en ítems existentes
      await db.execute(`INSERT INTO suppliers (id, "organizationId", name, "createdAt", "updatedAt")
        SELECT lower(hex(randomblob(16))), i."organizationId", i.supplier, ?, ?
        FROM inventory_items i
        WHERE i.supplier IS NOT NULL AND i.supplier != ''
          AND NOT EXISTS (
            SELECT 1 FROM suppliers s
            WHERE s."organizationId" IS i."organizationId" AND lower(s.name) = lower(i.supplier)
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
