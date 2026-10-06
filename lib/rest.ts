import { NextResponse } from 'next/server';
import { InValue } from '@libsql/client';
import { db, ensureDb } from './db';
import { audit } from './audit';

export interface EntityConfig {
  table: string;
  columns: string[];
  jsonFields?: string[];
  numberFields?: string[];
  booleanFields?: string[];
  /** si la tabla es multi-tenant, la columna organizationId debe estar en columns */
  tenant?: boolean;
  /** Lógica posterior a la creación (p. ej. descontar inventario). */
  afterCreate?: (data: Record<string, unknown>, requester: Requester) => Promise<unknown[]>;
  /** Lógica posterior a la actualización; prev es la fila antes del cambio. */
  afterUpdate?: (id: string, data: Record<string, unknown>, prev: Record<string, unknown>, requester: Requester) => Promise<unknown[]>;
}

export interface Requester {
  id: string;
  role: string;
  organizationId: string | null;
}

/** Resuelve el usuario que llama desde la cookie JWT firmada (no falsificable). */
export async function getRequester(request: Request): Promise<Requester | null> {
  const { getSessionUser } = await import('./auth');
  return getSessionUser(request);
}

/** 401 si no hay sesión válida. */
export async function requireRequester(request: Request): Promise<Requester | NextResponse> {
  const requester = await getRequester(request);
  if (!requester) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  return requester;
}

export function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

/** Log de auditoría de una operación sobre una entidad. Best-effort. */
async function logOp(
  requester: Requester,
  request: Request,
  action: string,
  config: EntityConfig,
  entityId?: string | null,
  detail?: string
): Promise<void> {
  try {
    const u = await db.execute({
      sql: `SELECT email, "firstName", "lastName" FROM users WHERE id = ?`,
      args: [requester.id],
    });
    const row = u.rows[0];
    await audit(
      {
        userId: requester.id,
        userEmail: (row?.email as string) ?? null,
        userName: row ? `${row.firstName} ${row.lastName}` : null,
        organizationId: requester.organizationId,
        action,
        entity: config.table,
        entityId: entityId ?? null,
        detail: detail ?? null,
      },
      request
    );
  } catch {
    // nunca bloquear la operación por un fallo de auditoría
  }
}

/** Organización efectiva para filtrar: la del usuario, o la que un super_admin pida por query param. */
function effectiveOrgId(request: Request, requester: Requester): string | null {
  if (requester.role === 'super_admin') {
    return new URL(request.url).searchParams.get('organizationId');
  }
  return requester.organizationId;
}

function serialize(config: EntityConfig, data: Record<string, unknown>): Record<string, InValue> {
  const row: Record<string, InValue> = {};
  for (const col of config.columns) {
    let value = data[col];
    if (value === undefined) value = null;
    if (config.jsonFields?.includes(col) && value !== null) {
      value = JSON.stringify(value);
    }
    if (config.booleanFields?.includes(col) && value !== null) {
      value = value ? 1 : 0;
    }
    row[`"${col}"`] = value as InValue;
  }
  return row;
}

function deserialize(config: EntityConfig, row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const col of config.columns) {
    let value = row[col];
    if (config.jsonFields?.includes(col) && typeof value === 'string') {
      value = JSON.parse(value);
    }
    if (config.numberFields?.includes(col) && value !== null) {
      value = Number(value);
    }
    if (config.booleanFields?.includes(col) && value !== null) {
      value = Boolean(value);
    }
    out[col] = value;
  }
  return out;
}

export function makeCollectionHandlers(config: EntityConfig) {
  const cols = config.columns.map(c => `"${c}"`).join(', ');

  const GET = async (request: Request) => {
    const requester = await requireRequester(request);
    if (isNextResponse(requester)) return requester;
    await ensureDb();

    if (config.tenant) {
      const orgId = effectiveOrgId(request, requester);
      if (orgId) {
        const result = await db.execute({
          sql: `SELECT ${cols} FROM "${config.table}" WHERE "organizationId" = ? ORDER BY "createdAt" DESC`,
          args: [orgId],
        });
        await logOp(requester, request, 'view', config);
        return NextResponse.json(result.rows.map(r => deserialize(config, r as unknown as Record<string, unknown>)));
      }
      if (requester.role !== 'super_admin') {
        return NextResponse.json({ error: 'El usuario no pertenece a ninguna organización' }, { status: 403 });
      }
    }

    const result = await db.execute(`SELECT ${cols} FROM "${config.table}" ORDER BY "createdAt" DESC`);
    await logOp(requester, request, 'view', config);
    return NextResponse.json(result.rows.map(r => deserialize(config, r as unknown as Record<string, unknown>)));
  };

  const POST = async (request: Request) => {
    const requester = await requireRequester(request);
    if (isNextResponse(requester)) return requester;
    await ensureDb();
    const body = await request.json();

    if (config.tenant) {
      const requestedOrg = body.organizationId ?? null;
      if (requester.role === 'super_admin') {
        if (!requestedOrg) {
          return NextResponse.json({ error: 'Como super admin debés indicar organizationId' }, { status: 400 });
        }
        body.organizationId = requestedOrg;
      } else {
        if (requestedOrg && requestedOrg !== requester.organizationId) {
          return NextResponse.json({ error: 'No podés crear registros en otra organización' }, { status: 403 });
        }
        body.organizationId = requester.organizationId;
      }
      if (!body.organizationId) {
        return NextResponse.json({ error: 'El usuario no pertenece a ninguna organización' }, { status: 403 });
      }
    }

    const now = new Date().toISOString();
    const data = { ...body, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    const row = serialize(config, data);
    const names = Object.keys(row).join(', ');
    const placeholders = Object.keys(row).map(() => '?').join(', ');
    await db.execute({ sql: `INSERT INTO "${config.table}" (${names}) VALUES (${placeholders})`, args: Object.values(row) });
    await logOp(requester, request, 'create', config, data.id as string);
    let warnings: unknown[] = [];
    if (config.afterCreate) {
      try {
        warnings = (await config.afterCreate(data, requester)) ?? [];
      } catch (e) {
        console.error(`afterCreate ${config.table}:`, e);
      }
    }
    const resBody = deserialize(config, data) as Record<string, unknown>;
    if (warnings.length > 0) resBody._warnings = warnings;
    return NextResponse.json(resBody, { status: 201 });
  };

  return { GET, POST };
}

export function makeItemHandlers(config: EntityConfig) {
  const cols = config.columns.map(c => `"${c}"`).join(', ');

  const GET = async (request: Request, { params }: { params: { id: string } }) => {
    const requester = await requireRequester(request);
    if (isNextResponse(requester)) return requester;
    await ensureDb();

    const filters: string[] = ['id = ?'];
    const args: InValue[] = [params.id];
    if (config.tenant && requester.role !== 'super_admin') {
      filters.push('"organizationId" = ?');
      args.push(requester.organizationId as InValue);
    }
    const result = await db.execute({
      sql: `SELECT ${cols} FROM "${config.table}" WHERE ${filters.join(' AND ')}`,
      args,
    });
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(deserialize(config, result.rows[0] as unknown as Record<string, unknown>));
  };

  const PATCH = async (request: Request, { params }: { params: { id: string } }) => {
    const requester = await requireRequester(request);
    if (isNextResponse(requester)) return requester;
    await ensureDb();
    const body = await request.json();

    // Verificar que el registro pertenece a la organización del usuario
    const existing = await db.execute({
      sql: `SELECT ${cols} FROM "${config.table}" WHERE id = ?`,
      args: [params.id],
    });
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (config.tenant && requester.role !== 'super_admin') {
      const rowOrg = existing.rows[0].organizationId as string | null;
      if (rowOrg !== requester.organizationId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const data: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const col of config.columns) {
      if (col in body) data[col] = body[col];
    }
    const row = Object.fromEntries(
      Object.keys(data).map(col => [col, serialize(config, { [col]: data[col] })[`"${col}"`]])
    );
    const assignments = Object.keys(row).map(k => `${k} = ?`).join(', ');
    const args = [...Object.values(row), params.id];
    await db.execute({
      sql: `UPDATE "${config.table}" SET ${assignments} WHERE id = ?`,
      args,
    });
    await logOp(requester, request, 'update', config, params.id);
    let warnings: unknown[] = [];
    if (config.afterUpdate) {
      try {
        // Los campos del body que no son columnas (p. ej. `items` de una receta)
        // no se persisten directo pero sí llegan al hook para su lógica propia.
        const extra = Object.fromEntries(
          Object.keys(body)
            .filter(k => !config.columns.includes(k) && !(k in data))
            .map(k => [k, body[k]])
        );
        warnings = (await config.afterUpdate(params.id, { ...data, ...extra }, existing.rows[0] as unknown as Record<string, unknown>, requester)) ?? [];
      } catch (e) {
        console.error(`afterUpdate ${config.table}:`, e);
      }
    }
    const updated = await db.execute({
      sql: `SELECT ${cols} FROM "${config.table}" WHERE id = ?`,
      args: [params.id],
    });
    const resBody = deserialize(config, updated.rows[0] as unknown as Record<string, unknown>) as Record<string, unknown>;
    if (warnings.length > 0) resBody._warnings = warnings;
    return NextResponse.json(resBody);
  };

  const DELETE = async (request: Request, { params }: { params: { id: string } }) => {
    const requester = await requireRequester(request);
    if (isNextResponse(requester)) return requester;
    await ensureDb();

    const filters: string[] = ['id = ?'];
    const args: InValue[] = [params.id];
    if (config.tenant && requester.role !== 'super_admin') {
      filters.push('"organizationId" = ?');
      args.push(requester.organizationId as InValue);
    }
    const result = await db.execute({
      sql: `DELETE FROM "${config.table}" WHERE ${filters.join(' AND ')}`,
      args,
    });
    if (result.rowsAffected === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await logOp(requester, request, 'delete', config, params.id);
    return NextResponse.json({ success: true });
  };

  return { GET, PATCH, DELETE };
}

export const patientsConfig: EntityConfig = {
  table: 'patients',
  columns: ['id', 'organizationId', 'firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'address', 'emergencyContact', 'emergencyPhone', 'medicalHistory', 'insuranceInfo', 'createdAt', 'updatedAt'],
  jsonFields: ['insuranceInfo'],
  tenant: true,
};

export const appointmentsConfig: EntityConfig = {
  table: 'appointments',
  columns: ['id', 'organizationId', 'patientId', 'patientName', 'doctorId', 'doctorName', 'date', 'time', 'duration', 'type', 'status', 'notes', 'recipeId', 'createdAt', 'updatedAt'],
  numberFields: ['duration'],
  tenant: true,
  // Al completar una cita se descuentan los consumibles de consulta y la receta asociada
  afterUpdate: async (id, data, prev) => {
    if (data.status !== 'completed' || prev.status === 'completed') return [];
    const orgId = data.organizationId as string | null ?? prev.organizationId as string | null;
    if (!orgId) return [];
    const { deductConsultConsumables, deductRecipe } = await import('./inventory-deduct');
    const warnings = await deductConsultConsumables(orgId, `Consulta ${String(id).slice(0, 8)}`, 'Sistema (cita completada)');
    // Receta explícita de la cita, o la receta activa cuyo nombre coincida con el tipo de servicio
    const recipeId = (data.recipeId ?? prev.recipeId) as string | null;
    let resolved = recipeId;
    if (!resolved) {
      const type = String(data.type ?? prev.type ?? '').trim();
      if (type) {
        const match = await db.execute({
          sql: `SELECT id FROM treatment_recipes
                WHERE "organizationId" = ? AND active = 1 AND lower(name) = lower(?) LIMIT 1`,
          args: [orgId, type],
        });
        resolved = (match.rows[0]?.id as string) ?? null;
      }
    }
    if (resolved) {
      warnings.push(...await deductRecipe(orgId, resolved, String(id), `Servicio ${String(id).slice(0, 8)} — ${String(data.type ?? prev.type ?? '')}`, 'Sistema (servicio completado)'));
    }
    return warnings;
  },
};

export const prescriptionsConfig: EntityConfig = {
  table: 'prescriptions',
  columns: ['id', 'organizationId', 'patientId', 'patientName', 'doctorId', 'doctorName', 'appointmentId', 'recordId', 'medications', 'diagnosis', 'instructions', 'status', 'createdAt', 'updatedAt'],
  jsonFields: ['medications'],
  tenant: true,
  // Al crear una receta se descuentan los medicamentos que existan en inventario (por nombre)
  afterCreate: async (data, requester) => {
    const orgId = (data.organizationId ?? requester.organizationId) as string | null;
    const meds = (data.medications ?? []) as { name?: string }[];
    if (!orgId || !Array.isArray(meds)) return [];
    const { deductByName } = await import('./inventory-deduct');
    const warnings = [];
    for (const med of meds) {
      if (med?.name?.trim()) {
        const warning = await deductByName(orgId, med.name.trim(), 1, `Despacho por receta ${String(data.id).slice(0, 8)}`, 'Sistema (receta)');
        if (warning) warnings.push(warning);
      }
    }
    return warnings;
  },
};

export const invoicesConfig: EntityConfig = {
  table: 'invoices',
  columns: ['id', 'organizationId', 'patientId', 'patientName', 'appointmentId', 'items', 'subtotal', 'tax', 'total', 'status', 'dueDate', 'paidDate', 'paymentMethod', 'notes', 'createdAt', 'updatedAt'],
  jsonFields: ['items'],
  numberFields: ['subtotal', 'tax', 'total'],
  tenant: true,
  // Al marcar la factura como pagada: registra el cobro en caja y sella la fecha de pago
  afterUpdate: async (id, data, prev, requester) => {
    if (data.status !== 'paid' || prev.status === 'paid') return [];
    const orgId = (data.organizationId ?? prev.organizationId ?? requester.organizationId) as string | null;
    if (!orgId) return [];
    const now = new Date().toISOString();
    const method = ['efectivo', 'punto', 'transferencia', 'otro'].includes(String(data.paymentMethod ?? ''))
      ? String(data.paymentMethod)
      : 'efectivo';
    if (!data.paidDate && !prev.paidDate) {
      await db.execute({
        sql: `UPDATE invoices SET "paidDate" = ? WHERE id = ?`,
        args: [now, String(id)],
      });
    }
    await db.execute({
      sql: `INSERT INTO cash_entries (id, "organizationId", type, concept, amount, method, "patientId", "patientName", date, "registeredBy", "createdAt", "updatedAt")
            VALUES (?, ?, 'ingreso', ?, ?, ?, ?, ?, ?, 'Sistema (factura)', ?, ?)`,
      args: [
        crypto.randomUUID(),
        orgId,
        `Cobro factura ${String(id).slice(0, 8).toUpperCase()} — ${data.patientName ?? prev.patientName ?? ''}`.trim(),
        Number(data.total ?? prev.total ?? 0),
        method,
        (data.patientId ?? prev.patientId ?? null) as string | null,
        (data.patientName ?? prev.patientName ?? null) as string | null,
        now.slice(0, 10),
        now,
        now,
      ],
    });
    return [];
  },
};

export const usersConfig: EntityConfig = {
  table: 'users',
  columns: ['id', 'organizationId', 'email', 'firstName', 'lastName', 'role', 'avatar', 'signature', 'isActive', 'createdAt', 'updatedAt'],
  booleanFields: ['isActive'],
  tenant: true,
};

export const medicalRecordsConfig: EntityConfig = {
  table: 'medical_records',
  columns: ['id', 'organizationId', 'patientId', 'patientName', 'doctorId', 'doctorName', 'date', 'status', 'triageLevel', 'motivo', 'enfermedadActual', 'bloodPressure', 'heartRate', 'temperature', 'weight', 'height', 'oxygenSat', 'diagnostico', 'indicaciones', 'createdAt', 'updatedAt'],
  numberFields: ['heartRate', 'temperature', 'weight', 'height', 'oxygenSat'],
  tenant: true,
};

export const cashEntriesConfig: EntityConfig = {
  table: 'cash_entries',
  columns: ['id', 'organizationId', 'type', 'concept', 'amount', 'method', 'patientId', 'patientName', 'date', 'registeredBy', 'createdAt', 'updatedAt'],
  numberFields: ['amount'],
  tenant: true,
};

export const inventoryItemsConfig: EntityConfig = {
  table: 'inventory_items',
  columns: ['id', 'organizationId', 'name', 'category', 'unit', 'stock', 'minStock', 'cost', 'supplier', 'deductOnConsult', 'createdAt', 'updatedAt'],
  numberFields: ['stock', 'minStock', 'cost'],
  booleanFields: ['deductOnConsult'],
  tenant: true,
};

export const stockMovementsConfig: EntityConfig = {
  table: 'stock_movements',
  columns: ['id', 'organizationId', 'itemId', 'itemName', 'type', 'quantity', 'reason', 'date', 'registeredBy', 'createdAt', 'updatedAt'],
  numberFields: ['quantity'],
  tenant: true,
};

export const inventoryCategoriesConfig: EntityConfig = {
  table: 'inventory_categories',
  columns: ['id', 'organizationId', 'name', 'createdAt', 'updatedAt'],
  tenant: true,
};

export const suppliersConfig: EntityConfig = {
  table: 'suppliers',
  columns: ['id', 'organizationId', 'name', 'phone', 'email', 'createdAt', 'updatedAt'],
  tenant: true,
};

export const organizationsConfig: EntityConfig = {
  table: 'organizations',
  columns: ['id', 'name', 'type', 'currency', 'isActive', 'createdAt', 'updatedAt'],
  booleanFields: ['isActive'],
};

// Catálogo global de insumos (SKU del proveedor). Sin tenant: el stock es del dueño del SaaS.
export const lashProductsConfig: EntityConfig = {
  table: 'lash_products',
  columns: ['id', 'sku', 'name', 'unit', 'stock', 'minStock', 'cost', 'supplier', 'createdAt', 'updatedAt'],
  numberFields: ['stock', 'minStock', 'cost'],
  tenant: false,
};

// Recetas de tratamiento por salón. `items` llega en el body y se persiste en
// recipe_items vía afterCreate/afterUpdate (no es columna de la tabla).
export const treatmentRecipesConfig: EntityConfig = {
  table: 'treatment_recipes',
  columns: ['id', 'organizationId', 'name', 'servicesPerWeek', 'active', 'createdAt', 'updatedAt'],
  numberFields: ['servicesPerWeek'],
  booleanFields: ['active'],
  tenant: true,
  afterCreate: async (_data, _requester) => {
    await syncRecipeItems(String(_data.id), _data);
    return [];
  },
  afterUpdate: async (id, data) => {
    if ('items' in data) await syncRecipeItems(String(id), data);
    return [];
  },
};

/** Reemplaza los recipe_items de una receta con la lista `items` del body. */
async function syncRecipeItems(recipeId: string, data: Record<string, unknown>): Promise<void> {
  const items = data.items;
  if (!Array.isArray(items)) return;
  const now = new Date().toISOString();
  await db.execute({ sql: `DELETE FROM recipe_items WHERE "recipeId" = ?`, args: [recipeId] });
  for (const item of items) {
    const it = item as { inventoryItemId?: string | null; productId?: string | null; quantityPerService?: number };
    if (!it?.quantityPerService) continue;
    await db.execute({
      sql: `INSERT INTO recipe_items (id, "recipeId", "inventoryItemId", "productId", "quantityPerService", "createdAt", "updatedAt")
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), recipeId, it.inventoryItemId ?? null, it.productId ?? null, Number(it.quantityPerService), now, now],
    });
  }
}

/** Lee una receta con sus ítems (para GET individual y para la edición). */
export async function getRecipeWithItems(recipeId: string): Promise<Record<string, unknown> | null> {
  const r = await db.execute({ sql: `SELECT * FROM treatment_recipes WHERE id = ?`, args: [recipeId] });
  if (r.rows.length === 0) return null;
  const recipe = { ...r.rows[0], active: Boolean(r.rows[0].active) } as Record<string, unknown>;
  const items = await db.execute({
    sql: `SELECT id, "inventoryItemId", "productId", "quantityPerService" FROM recipe_items WHERE "recipeId" = ?`,
    args: [recipeId],
  });
  recipe.items = items.rows.map(row => ({
    id: row.id,
    inventoryItemId: row.inventoryItemId,
    productId: row.productId,
    quantityPerService: Number(row.quantityPerService),
  }));
  return recipe;
}
