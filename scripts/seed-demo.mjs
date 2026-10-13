import { db, closeDb } from './pg.mjs';
import { randomUUID } from 'node:crypto';

const now = new Date();
const iso = now.toISOString();
const today = iso.slice(0, 10);
const daysFromNow = (n) => new Date(now.getTime() + n * 86400000).toISOString().slice(0, 10);
const uid = () => randomUUID();

const org = (await db.execute('SELECT id FROM organizations ORDER BY "createdAt" LIMIT 1')).rows[0];
if (!org) { console.error('No hay organizaciones'); process.exit(1); }
const orgId = org.id;

const patientCount = Number(
  (await db.execute({ sql: 'SELECT COUNT(*) AS c FROM patients WHERE "organizationId" = ?', args: [orgId] })).rows[0].c
);
if (patientCount >= 3) {
  console.log(`Ya hay ${patientCount} pacientes en la organización — no se siembra nada.`);
  process.exit(0);
}

// --- Pacientes (nombres de fantasía) ---
const patientData = [
  ['María', 'Rondón', 'maria.rondon@example.com', '0414-1122334', '1985-03-12'],
  ['José Gregorio', 'Hernández', 'jose.hernandez@example.com', '0412-4455667', '1978-11-02'],
  ['Ana Carolina', 'Martínez', 'ana.martinez@example.com', '0424-7788990', '1992-07-25'],
  ['Luis', 'Guerrero', 'luis.guerrero@example.com', '0416-3344556', '1969-01-18'],
  ['Valentina', 'Pérez', 'valentina.perez@example.com', '0412-9988776', '2015-09-30'],
  ['Pedro', 'Márquez', 'pedro.marquez@example.com', '0414-5566778', '1954-05-08'],
  ['Gabriela', 'Sánchez', 'gabriela.sanchez@example.com', '0426-2233445', '1988-12-14'],
  ['Ricardo', 'Blanco', 'ricardo.blanco@example.com', '0414-8877665', '1975-04-21'],
];
const patients = [];
for (const [firstName, lastName, email, phone, dob] of patientData) {
  const id = uid();
  patients.push({ id, firstName, lastName });
  await db.execute({
    sql: `INSERT INTO patients (id, "organizationId", "firstName", "lastName", email, phone, "dateOfBirth", address, "emergencyContact", "emergencyPhone", "createdAt", "updatedAt")
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [orgId ? id : id, orgId, firstName, lastName, email, phone, dob, 'Caracas', 'Familiar directo', '0212-5551234', iso, iso],
  });
}
const P = (i) => patients[i];

// Doctor existente de la organización
const doctor = (await db.execute(`SELECT id, "firstName", "lastName" FROM users WHERE role = 'doctor' AND "organizationId" = ? LIMIT 1`, [orgId])).rows[0]
  ?? (await db.execute(`SELECT id, "firstName", "lastName" FROM users WHERE role = 'admin' AND "organizationId" = ? LIMIT 1`, [orgId])).rows[0];
const doctorId = doctor.id;
const doctorName = `Dr. ${doctor.firstName} ${doctor.lastName}`;

// --- Citas: ayer completada, hoy varias, próximas ---
const appts = [];
const apptSpecs = [
  [-1, '09:00', 0, 'consultation', 'completed'],
  [-1, '10:30', 0, 'checkup', 'completed'],
  [0, '08:30', 1, 'consultation', 'confirmed'],
  [0, '09:15', 2, 'follow-up', 'confirmed'],
  [0, '10:00', 3, 'procedure', 'scheduled'],
  [0, '11:30', 4, 'checkup', 'scheduled'],
  [0, '14:00', 5, 'consultation', 'confirmed'],
  [1, '09:00', 6, 'consultation', 'scheduled'],
  [2, '15:00', 7, 'follow-up', 'scheduled'],
];
for (const [offset, time, pi, type, status] of apptSpecs) {
  const id = uid();
  const p = P(pi);
  appts.push({ id, patientId: p.id, patientName: `${p.firstName} ${p.lastName}` });
  await db.execute({
    sql: `INSERT INTO appointments (id, "organizationId", "patientId", "patientName", "doctorId", "doctorName", date, time, duration, type, status, "createdAt", "updatedAt")
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 30, ?, ?, ?, ?)`,
    args: [id, orgId, p.id, `${p.firstName} ${p.lastName}`, doctorId, doctorName, daysFromNow(offset), time, type, status, iso, iso],
  });
}

// --- Historias clínicas (2 completadas + 1 en triaje) ---
const recordSpecs = [
  [appts[0], 'completada', 'verde', 'Cefalea tensional', 'Paracetamol 500mg c/8h por 3 días', '365/24', 78, 36.5, 70, 170, 98],
  [appts[1], 'completada', 'verde', 'Control de presión arterial', 'Continuar Enalapril 10mg c/24h', '150/90', 82, 36.7, 85, 175, 95],
];
for (const [a, status, triage, motivo, indicaciones, bp, hr, temp, w, h, ox] of recordSpecs) {
  await db.execute({
    sql: `INSERT INTO medical_records (id, "organizationId", "patientId", "patientName", "doctorId", "doctorName", date, status, "triageLevel", motivo, enfermedadActual, "bloodPressure", "heartRate", temperature, weight, height, "oxygenSat", diagnostico, indicaciones, "createdAt", "updatedAt")
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [uid(), orgId, a.patientId, a.patientName, doctorId, doctorName, daysFromNow(-1), status, triage, motivo, 'Paciente refiere molestias desde hace 3 días.', bp, hr, temp, w, h, ox, motivo, indicaciones, iso, iso],
  });
}
const t = P(3);
await db.execute({
  sql: `INSERT INTO medical_records (id, "organizationId", "patientId", "patientName", "doctorId", "doctorName", date, status, "triageLevel", motivo, "createdAt", "updatedAt")
        VALUES (?, ?, ?, ?, ?, ?, ?, 'triaje', 'amarillo', ?, ?, ?)`,
  args: [uid(), orgId, t.id, `${t.firstName} ${t.lastName}`, doctorId, doctorName, today, 'Dolor abdominal leve, sin fiebre.', iso, iso],
});

// --- Receta ---
const rxP = P(0);
await db.execute({
  sql: `INSERT INTO prescriptions (id, "organizationId", "patientId", "patientName", "doctorId", "doctorName", medications, diagnosis, instructions, status, "createdAt", "updatedAt")
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
  args: [
    uid(), orgId, rxP.id, `${rxP.firstName} ${rxP.lastName}`, doctorId, doctorName,
    JSON.stringify([
      { id: uid(), name: 'Paracetamol', dosage: '500mg', frequency: 'Cada 8 horas', duration: '5 días', instructions: 'Después de las comidas' },
      { id: uid(), name: 'Ibuprofeno', dosage: '400mg', frequency: 'Cada 12 horas', duration: '3 días', instructions: '' },
    ]),
    'Cefalea tensional', 'Reposo relativo e hidratación.', iso, iso,
  ],
});

// --- Inventario: categorías, proveedores, ítems ---
const cats = ['EPP', 'Inyección', 'Medicamentos'];
const catIds = {};
for (const name of cats) {
  const id = uid();
  catIds[name] = id;
  await db.execute({
    sql: `INSERT INTO inventory_categories (id, "organizationId", name, "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?)`,
    args: [id, orgId, name, iso, iso],
  });
}
const sups = ['Distribuidora Farma C.A.', 'Suministros Médicos del Centro'];
const supIds = {};
for (const name of sups) {
  const id = uid();
  supIds[name] = id;
  await db.execute({
    sql: `INSERT INTO suppliers (id, "organizationId", name, phone, email, "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, orgId, name, '0212-5559988', 'ventas@farma.com', iso, iso],
  });
}
const items = [
  ['SKU-0001', 'Guantes de nitrilo (talla M)', 'EPP', 'caja', 100, 'unidad', 24, 10, 8.5, 'Distribuidora Farma C.A.', 1],
  ['SKU-0002', 'Jeringa desechable 5ml', 'Inyección', 'paquete', 20, 'unidad', 60, 20, 3.2, 'Suministros Médicos del Centro', 1],
  ['SKU-0003', 'Algodón 500g', 'EPP', 'paquete', 500, 'g', 8, 10, 4.0, 'Suministros Médicos del Centro', 0],
  ['SKU-0004', 'Paracetamol 500mg (caja)', 'Medicamentos', 'caja', 1, 'unidad', 35, 15, 2.75, 'Distribuidora Farma C.A.', 0],
  ['SKU-0005', 'Suero fisiológico 500ml', 'Medicamentos', 'frasco', 500, 'ml', 18, 12, 1.9, 'Distribuidora Farma C.A.', 0],
];
const itemIds = [];
for (const [sku, name, cat, unit, packSize, measureUnit, stock, min, cost, sup, cons] of items) {
  const id = uid();
  itemIds.push({ id, name, stock });
  await db.execute({
    sql: `INSERT INTO inventory_items (id, "organizationId", sku, name, category, unit, "packSize", "measureUnit", stock, "minStock", cost, supplier, "deductOnConsult", "createdAt", "updatedAt")
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, orgId, sku, name, cat, unit, packSize, measureUnit, stock, min, cost, sup, cons, iso, iso],
  });
}
// Movimientos de ejemplo
const moves = [
  ['entrada', 50, 'Compra a proveedor', itemIds[0]],
  ['salida', 12, 'Uso en consultas de la semana', itemIds[0]],
  ['entrada', 30, 'Compra a proveedor', itemIds[3]],
];
for (const [type, qty, reason, it] of moves) {
  await db.execute({
    sql: `INSERT INTO stock_movements (id, "organizationId", "itemId", "itemName", type, quantity, reason, date, "registeredBy", "createdAt", "updatedAt")
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Admin Sistema', ?, ?)`,
    args: [uid(), orgId, it.id, it.name, type, qty, reason, today, iso, iso],
  });
}

// --- Facturas (1 pagada, 1 pendiente) + cobro en caja de la pagada ---
const money = [
  [0, 'paid', 'efectivo', [['Consulta médica general', 1, 30], ['Electrocardiograma', 1, 20]]],
  [2, 'pending', null, [['Consulta pediátrica', 1, 35]]],
];
for (const [pi, status, method, rows] of money) {
  const p = P(pi);
  const subtotal = rows.reduce((s, [, q, u]) => s + q * u, 0);
  const tax = +(subtotal * 0.16).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);
  const invId = uid();
  const invItems = rows.map(([d, q, u]) => ({ id: uid(), description: d, quantity: q, unitPrice: u, total: +(q * u).toFixed(2) }));
  await db.execute({
    sql: `INSERT INTO invoices (id, "organizationId", "patientId", "patientName", items, subtotal, tax, total, status, "dueDate", "paidDate", "paymentMethod", "createdAt", "updatedAt")
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      invId, orgId, p.id, `${p.firstName} ${p.lastName}`, JSON.stringify(invItems),
      subtotal, tax, total, status, daysFromNow(15),
      status === 'paid' ? today : null, method, iso, iso,
    ],
  });
  if (status === 'paid') {
    await db.execute({
      sql: `INSERT INTO cash_entries (id, "organizationId", type, concept, amount, method, "patientId", "patientName", date, "registeredBy", "createdAt", "updatedAt")
            VALUES (?, ?, 'ingreso', ?, ?, ?, ?, ?, ?, 'Admin Sistema', ?, ?)`,
      args: [uid(), orgId, `Cobro factura ${invId.slice(0, 8).toUpperCase()} — ${p.firstName} ${p.lastName}`, total, method, p.id, `${p.firstName} ${p.lastName}`, today, iso, iso],
    });
    await db.execute({
      sql: `INSERT INTO cash_entries (id, "organizationId", type, concept, amount, method, date, "registeredBy", "createdAt", "updatedAt")
            VALUES (?, ?, 'egreso', ?, ?, 'efectivo', ?, 'Admin Sistema', ?, ?)`,
      args: [uid(), orgId, 'Compra de insumos médicos', 45.0, today, iso, iso],
    });
  }
}

await closeDb();
console.log('Datos de demostración sembrados: 8 pacientes, 9 citas, 3 historias, 1 receta, 5 ítems, 2 facturas, caja del día.');
