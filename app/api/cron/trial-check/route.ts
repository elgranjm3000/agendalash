export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { db, ensureDb } from '@/lib/db';
import { sendEmail } from '@/lib/email';

const NOTICE_DAYS = [3, 1, 0]; // avisar al admin 3 días, 1 día y el día del vencimiento
const todayStr = () => new Date().toISOString().split('T')[0];

function daysLeft(trialEndsAt: string): number {
  return Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

/**
 * GET|POST /api/cron/trial-check — corre una vez al día (Vercel Cron).
 * Avisa a los admins de organizaciones cuya prueba vence en 3/1/0 días
 * y a ventas cuando expira. Protegido por CRON_SECRET si está configurado.
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
  const sent: string[] = [];

  const orgs = await db.execute({
    sql: `SELECT id, name, "trialEndsAt", "lastTrialNotice", currency FROM organizations WHERE "trialEndsAt" IS NOT NULL`,
  });

  for (const org of orgs.rows) {
    const trialEndsAt = org.trialEndsAt as string;
    const left = daysLeft(trialEndsAt);
    const alreadyNotified = org.lastTrialNotice === `${today}-${left}`;
    if (alreadyNotified) continue;

    const admin = await db.execute({
      sql: `SELECT email, "firstName" FROM users WHERE "organizationId" = ? AND role = 'admin' AND "isActive" = 1 LIMIT 1`,
      args: [org.id as string],
    });
    if (admin.rows.length === 0) continue;
    const to = admin.rows[0].email as string;
    const firstName = admin.rows[0].firstName as string;
    const orgName = org.name as string;

    if (NOTICE_DAYS.includes(left)) {
      await sendEmail({
        to,
        subject: left === 0
          ? `Tu prueba de AgendaLash termina hoy — ${orgName}`
          : `Te quedan ${left} días de prueba — AgendaLash`,
        html: `<p>Hola ${firstName},</p>
               <p>La prueba gratuita de <strong>${orgName}</strong> ${left === 0 ? 'termina <strong>hoy</strong>' : `termina en <strong>${left} día(s)</strong>`}.</p>
               <p>Tus datos están a salvo. Para seguir usando AgendaLash, respondé este email solicitando tu licencia.</p>`,
      }, { organizationId: org.id as string });
      sent.push(`${orgName}: aviso ${left}d → ${to}`);
      await db.execute({
        sql: `UPDATE organizations SET "lastTrialNotice" = ? WHERE id = ?`,
        args: [`${today}-${left}`, org.id as string],
      });
    } else if (left < 0 && !alreadyNotified && left >= -1) {
      // venció ayer/hoy: avisar a ventas
      const sales = process.env.SALES_EMAIL;
      if (sales) {
        await sendEmail({
          to: sales,
          subject: `🔥 Prueba vencida — contactar a ${orgName}`,
          html: `<p>La prueba de <strong>${orgName}</strong> (admin: ${to}) venció el ${trialEndsAt}.</p>
                 <p>Es buen momento para contactarlos y ofrecer la licencia.</p>`,
        }, { organizationId: org.id as string });
        sent.push(`${orgName}: aviso a ventas`);
        await db.execute({
          sql: `UPDATE organizations SET "lastTrialNotice" = ? WHERE id = ?`,
          args: [`${today}-${left}`, org.id as string],
        });
      }
    }
  }

  return NextResponse.json({ ok: true, sent, date: today });
}

export async function GET(request: Request) {
  return handle(request);
}
export async function POST(request: Request) {
  return handle(request);
}
