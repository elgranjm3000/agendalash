import { db, ensureDb, InValue } from './db';

export interface AuditEntry {
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  organizationId?: string | null;
  action: string; // login | login_failed | register | view | create | update | delete
  entity?: string;
  entityId?: string | null;
  detail?: string | null;
  ip?: string | null;
}

function clientIp(request: Request): string | null {
  // Detrás de proxy (Vercel, nginx, Cloudflare): x-forwarded-for trae la IP real del visitante
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  // Algunos proxies usan x-real-ip
  return request.headers.get('x-real-ip');
}

/** Registra en audit_log. Best-effort: nunca rompe la operación principal. */
export async function audit(entry: AuditEntry, request?: Request): Promise<void> {
  try {
    await ensureDb();
    await db.execute({
      sql: `INSERT INTO audit_log (id, ts, "userId", "userEmail", "userName", "organizationId", action, entity, "entityId", detail, ip)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        crypto.randomUUID(),
        new Date().toISOString(),
        entry.userId ?? null,
        entry.userEmail ?? null,
        entry.userName ?? null,
        entry.organizationId ?? null,
        entry.action,
        entry.entity ?? null,
        entry.entityId ?? null,
        entry.detail ?? null,
        request ? clientIp(request) : entry.ip ?? null,
      ] as InValue[],
    });
  } catch {
    // la auditoría nunca debe interrumpir la operación del usuario
  }
}
