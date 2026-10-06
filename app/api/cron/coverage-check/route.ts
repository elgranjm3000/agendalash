export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { db, ensureDb } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { audit } from '@/lib/audit';
import { coverageForOrg, COVERAGE_THRESHOLD_DAYS } from '@/lib/coverage';

const todayStr = () => new Date().toISOString().split('T')[0];

/**
 * GET|POST /api/cron/coverage-check — corre una vez al día (Vercel Cron).
 * Revisa la cobertura proyectada de insumos por salón (días restantes según
 * sus recetas) y avisa al admin del salón y al proveedor (dueño del SaaS)
 * cuando algún insumo está por agotarse. Idempotente por día vía audit_log.
 * Protegido por CRON_SECRET si está configurado.
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
  }
  await ensureDb();
  const today = todayStr();

  // Idempotencia sin migrar esquema: si ya corrió hoy, no repetir
  const already = await db.execute({
    sql: `SELECT id FROM audit_log WHERE action = 'coverage_notice' AND ts LIKE ? LIMIT 1`,
    args: [`${today}%`],
  });
  if (already.rows.length > 0) {
    return NextResponse.json({ ok: true, skipped: 'ya notificado hoy', date: today });
  }

  const orgs = await db.execute(`SELECT id, name FROM organizations`);
  const notified: string[] = [];
  const rollup: { org: string; sku: string; days: number }[] = [];

  for (const org of orgs.rows) {
    const rows = await coverageForOrg(org.id as string);
    const low = rows.filter(r => r.coverageDays !== null && r.coverageDays <= r.thresholdDays);
    if (low.length === 0) continue;

    const admin = await db.execute({
      sql: `SELECT email, "firstName" FROM users WHERE "organizationId" = ? AND role = 'admin' AND "isActive" = 1 LIMIT 1`,
      args: [org.id as string],
    });

    const table = low.map(r => {
      const days = r.coverageDays as number;
      return `<tr><td>${r.name}${r.sku ? ` (SKU ${r.sku})` : ''}</td><td>${r.stock} ${r.unit}</td><td>${days.toFixed(1)} días</td></tr>`;
    }).join('');

    if (admin.rows.length > 0) {
      const to = admin.rows[0].email as string;
      await sendEmail({
        to,
        subject: `⚠️ Insumos por agotarse — ${org.name as string}`,
        html: `<p>Hola ${admin.rows[0].firstName as string},</p>
               <p>Según tus recetas de tratamiento, estos insumos se agotan en menos de ${COVERAGE_THRESHOLD_DAYS} días:</p>
               <table border="1" cellpadding="6" cellspacing="0"><tr><th>Insumo</th><th>Stock</th><th>Cobertura</th></tr>${table}</table>
               <p>Repone pronto para no cancelar servicios.</p>`,
      }, { organizationId: org.id as string });
      notified.push(`${org.name as string} → ${to}`);
    }

    for (const r of low) {
      rollup.push({ org: org.name as string, sku: r.sku ?? r.name, days: r.coverageDays as number });
    }
  }

  if (rollup.length > 0) {
    // Aviso al proveedor (dueño del SaaS) con el rollup de toda la red
    const supplierEmail = process.env.SUPPLIER_ALERT_EMAIL
      || (await db.execute(`SELECT email FROM users WHERE role = 'super_admin' AND "isActive" = 1 LIMIT 1`)).rows[0]?.email;
    if (supplierEmail) {
      const table = rollup.map(r =>
        `<tr><td>${r.org}</td><td>${r.sku}</td><td>${r.days.toFixed(1)} días</td></tr>`
      ).join('');
      await sendEmail({
        to: supplierEmail as string,
        subject: `📦 Reposición sugerida — insumos con baja cobertura en la red`,
        html: `<p>Estos salones tienen insumos con menos de ${COVERAGE_THRESHOLD_DAYS} días de cobertura. Es momento de ofrecer reposición:</p>
               <table border="1" cellpadding="6" cellspacing="0"><tr><th>Salón</th><th>Insumo</th><th>Cobertura</th></tr>${table}</table>`,
      });
      notified.push(`proveedor → ${supplierEmail as string}`);
    }
  }

  // Marca de idempotencia (aunque no se envíen emails, registrar la corrida)
  await audit({
    action: 'coverage_notice',
    entity: 'coverage',
    organizationId: null,
    detail: notified.length > 0 ? notified.join('; ') : 'sin insumos bajo umbral',
  }, request);

  return NextResponse.json({ ok: true, notified, date: today });
}

export async function GET(request: Request) {
  return handle(request);
}
export async function POST(request: Request) {
  return handle(request);
}
