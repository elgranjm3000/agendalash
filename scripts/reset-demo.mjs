// Resetea la base de datos completa y siembra datos demo de AgendaLash.
// Uso: node scripts/reset-demo.mjs   (BORRA TODOS LOS DATOS — pedir confirmación)
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const db = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
const now = new Date();
const iso = now.toISOString();
const today = iso.slice(0, 10);
const daysFromNow = (n) => new Date(now.getTime() + n * 86400000).toISOString().slice(0, 10);
const uuid = () => randomUUID();

// 1. Borrar todas las tablas
const tables = [
  'recipe_items', 'treatment_recipes', 'lash_products', 'product_usage',
  'stock_movements', 'inventory_items', 'inventory_categories', 'suppliers',
  'cash_entries', 'medical_records', 'prescriptions', 'invoices', 'appointments',
  'patients', 'audit_log', 'exchange_rates', 'users', 'organizations',
];
console.log('Borrando tablas...');
for (const t of tables) {
  await db.execute(`DROP TABLE IF EXISTS "${t}"`);
}

// 2. Recrear esquema (autocontenido: extrae los CREATE de lib/db.ts vía scripts/schema.sql)
console.log('Recreando esquema...');
const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
await db.batch(schema.split(/;\s*\n/).map(s => s.trim()).filter(Boolean).map(sql => ({ sql, args: [] })));

// 2b. Migraciones ligeras que en la app aplica ensureDb con ALTER
for (const [table, def] of [
  ['inventory_items', '"deductOnConsult" INTEGER NOT NULL DEFAULT 0'],
  ['appointments', '"recipeId" TEXT'],
  ['organizations', 'currency TEXT'],
  ['organizations', '"trialEndsAt" TEXT'],
  ['organizations', 'logo TEXT'],
]) {
  try {
    await db.execute(`ALTER TABLE "${table}" ADD COLUMN ${def}`);
  } catch {
    // la columna ya existe
  }
}

// 3. Datos demo
console.log('Sembrando datos demo...');
const orgId = uuid();
await db.execute({
  sql: `INSERT INTO organizations (id, name, type, currency, "trialEndsAt", "isActive", "createdAt", "updatedAt")
        VALUES (?, ?, 'clinic', 'USD', ?, 1, ?, ?)`,
  args: [orgId, 'Estudio Belleza & Pestañas', daysFromNow(30), iso, iso],
});

const hash = await bcrypt.hash('demo123', 10);
// Super admin (proveedor): catálogo de insumos y rollup de la red
await db.execute({
  sql: `INSERT INTO users (id, email, password_hash, "firstName", "lastName", role, "organizationId", "isActive", "createdAt", "updatedAt")
        VALUES (?, 'admin@medicontrol.com', ?, 'Admin', 'Sistema', 'super_admin', NULL, 1, ?, ?)`,
  args: [uuid(), await bcrypt.hash('admin123', 10), iso, iso],
});
const users = [
  ['admin@agendalash.com', 'María', 'Fernández', 'admin', orgId],
  ['lash@agendalash.com', 'Carla', 'Rodríguez', 'doctor', orgId],
  ['asistente@agendalash.com', 'Luisa', 'Martínez', 'nurse', orgId],
  ['recepcion@agendalash.com', 'Ana', 'Gómez', 'receptionist', orgId],
];
for (const [email, first, last, role, org] of users) {
  await db.execute({
    sql: `INSERT INTO users (id, email, password_hash, "firstName", "lastName", role, "organizationId", "isActive", "createdAt", "updatedAt")
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    args: [uuid(), email, hash, first, last, role, org, iso, iso],
  });
}

// Clientas
const clientas = [
  ['Valeria', 'Rojas', 'valeria@example.com', '04141234567', '2001-03-15'],
  ['Camila', 'Herrera', 'camila@example.com', '04142345678', '1998-11-02'],
  ['Sofía', 'Paredes', 'sofia@example.com', '04143456789', '1995-07-21'],
  ['Isabella', 'Moreno', 'isabella@example.com', '04144567890', '2000-01-30'],
  ['Gabriela', 'Silva', 'gabriela@example.com', '04145678901', '1993-05-12'],
];
const clientaIds = [];
for (const [first, last, email, phone, dob] of clientas) {
  const id = uuid();
  clientaIds.push(id);
  await db.execute({
    sql: `INSERT INTO patients (id, "organizationId", "firstName", "lastName", email, phone, "dateOfBirth",
              address, "emergencyContact", "emergencyPhone", "medicalHistory", "insuranceInfo", "createdAt", "updatedAt")
          VALUES (?, ?, ?, ?, ?, ?, ?, 'Caracas', 'Familiar', '04140000000', 'Sin alergias conocidas', NULL, ?, ?)`,
    args: [id, orgId, first, last, email, phone, dob, iso, iso],
  });
}

// Insumos del salón (uno bajo para disparar alerta)
const insumos = [
  ['Permante lash 100ml', 'Químicos', 'ml', 45, 20],   // ok
  ['Fijador lash 60ml', 'Químicos', 'ml', 12, 10],     // warn
  ['Removedor 30ml', 'Químicos', 'ml', 4, 10],         // crítico
  ['Cepillos desechables', 'Desechables', 'unidades', 80, 30],
  ['Parches inferiores', 'Desechables', 'unidades', 60, 30],
];
const insumoIds = [];
for (const [name, category, unit, stock, min] of insumos) {
  const id = uuid();
  insumoIds.push(id);
  await db.execute({
    sql: `INSERT INTO inventory_items (id, "organizationId", name, category, unit, stock, "minStock", cost, "deductOnConsult", "createdAt", "updatedAt")
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    args: [id, orgId, name, category, unit, stock, min, 5, iso, iso],
  });
}

// Catálogo del proveedor (SKUs)
const skus = [
  ['LFT-PERM-100', 'Permante lash 100ml', 'ml', 120, 40],
  ['LFT-FIJA-060', 'Fijador lash 60ml', 'ml', 80, 30],
  ['LFT-REMO-030', 'Removedor 30ml', 'ml', 50, 20],
];
const skuIds = new Map();
for (const [sku, name, unit, stock, min] of skus) {
  const id = uuid();
  skuIds.set(name, id);
  await db.execute({
    sql: `INSERT INTO lash_products (id, sku, name, unit, stock, "minStock", cost, supplier, "createdAt", "updatedAt")
          VALUES (?, ?, ?, ?, ?, ?, ?, 'AgendaLash Supplies', ?, ?)`,
    args: [id, sku, name, unit, stock, min, 8, iso, iso],
  });
}

// Receta de tratamiento: Lifting de pestañas
const recipeId = uuid();
await db.execute({
  sql: `INSERT INTO treatment_recipes (id, "organizationId", name, "servicesPerWeek", active, "createdAt", "updatedAt")
        VALUES (?, ?, 'Lifting de pestañas', 8, 1, ?, ?)`,
  args: [recipeId, orgId, iso, iso],
});
const consumos = [
  [insumoIds[0], 'Permante lash 100ml', 2],   // 2 ml de permante por servicio
  [insumoIds[1], 'Fijador lash 60ml', 1],     // 1 ml de fijador
  [insumoIds[2], 'Removedor 30ml', 0.5],      // 0.5 ml de removedor
];
for (const [itemId, skuName, qty] of consumos) {
  await db.execute({
    sql: `INSERT INTO recipe_items (id, "recipeId", "inventoryItemId", "productId", "quantityPerService", "createdAt", "updatedAt")
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [uuid(), recipeId, itemId, skuIds.get(skuName), qty, iso, iso],
  });
}

// Citas de la semana (el tipo coincide con la receta para descontar al completar)
const lashUser = (await db.execute(`SELECT id FROM users WHERE email = 'lash@agendalash.com'`)).rows[0].id;
const horas = ['09:00', '11:00', '14:00', '16:00'];
for (let i = 0; i < 4; i++) {
  await db.execute({
    sql: `INSERT INTO appointments (id, "organizationId", "patientId", "patientName", "doctorId", "doctorName",
              date, time, duration, type, status, "recipeId", "createdAt", "updatedAt")
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 60, 'Lifting de pestañas', 'confirmed', ?, ?, ?)`,
    args: [uuid(), orgId, clientaIds[i], clientas[i][0] + ' ' + clientas[i][1], lashUser, 'Carla Rodríguez',
           daysFromNow(i + 1), horas[i], recipeId, iso, iso],
  });
}

// Caja: dos ingresos de ejemplo
await db.execute({
  sql: `INSERT INTO cash_entries (id, "organizationId", type, concept, amount, method, date, "registeredBy", "createdAt", "updatedAt")
        VALUES (?, ?, 'ingreso', 'Servicio lifting — Valeria Rojas', 25, 'efectivo', ?, 'Sistema', ?, ?)`,
  args: [uuid(), orgId, today, iso, iso],
});
await db.execute({
  sql: `INSERT INTO cash_entries (id, "organizationId", type, concept, amount, method, date, "registeredBy", "createdAt", "updatedAt")
        VALUES (?, ?, 'egreso', 'Compra cepillos desechables', 6, 'punto', ?, 'Sistema', ?, ?)`,
  args: [uuid(), orgId, today, iso, iso],
});

console.log('✅ Base de datos reseteada y sembrada.');
console.log(`
Usuarios de prueba (contraseña para todos: demo123):
  admin@agendalash.com        → Admin del estudio
  lash@agendalash.com         → Lash Artist
  asistente@agendalash.com    → Asistente
  recepcion@agendalash.com    → Recepción
  admin@medicontrol.com / admin123 → Super Admin (proveedor)

Demo: 5 clientas, 4 citas de "Lifting de pestañas" esta semana,
5 insumos (removedor en crítico, fijador en warn), catálogo con 3 SKUs
y receta vinculada para la proyección de cobertura.`);
