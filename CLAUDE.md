# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

MediControl / AgendaLash — sistema de gestión médica (Next.js 13 App Router + TypeScript, UI en español). Frontend SPA con backend en API routes y persistencia en PostgreSQL (vía `pg`). No hay suite de tests.

## Comandos

```bash
npm run dev     # desarrollo en http://localhost:3000
npm run build   # build de producción
npm run lint    # ESLint
node scripts/seed-demo.mjs             # siembra datos demo (idempotente; lee .env.local)
node scripts/reset-demo.mjs            # BORRA todo y re-siembra demo (pedir confirmación)
node scripts/migrate-turso-to-pg.mjs   # migra datos desde Turso (histórico; requiere @libsql/client y credenciales Turso en .env.local)
```

Variables de entorno (`.env.local`): `DATABASE_URL` (PostgreSQL), `JWT_SECRET`. (Quedan `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` solo para el script de migración.)

Producción: corre en este servidor como servicio systemd `agendalash.service` (puerto 3000) detrás de nginx con SSL para `agendalash.cl`.

## Arquitectura

**Capa de datos compartida entre frontend y backend vía convención de nombres:**

- `lib/types.ts` define los modelos (User, Patient, Appointment, Prescription, Invoice, etc.). Los nombres de entidad usados en rutas API (`/api/patients`) y en el cliente (`apiList('patients')`) coinciden con los directorios en `app/api/`.
- `lib/db.ts` — cliente PostgreSQL (`pg`) + `ensureDb()`: crea el esquema y usuarios por defecto en la primera consulta (lazy, memoizado). Expone la interfaz `db.execute({ sql, args })` / `db.execute(sql, args)` / `db.batch([...])` con placeholders `?` que se traducen a `$n` (compatibilidad con el código que venía de Turso). Columnas SQL en camelCase entre comillas (`"organizationId"`); los booleanos se guardan como INTEGER (0/1) y las fechas como TEXT ISO. Las tablas se crean con `CREATE TABLE IF NOT EXISTS` — **no hay migraciones**: cambios de esquema requieren editar los DDL (y `scripts/schema.sql`) y manejar la migración de datos existentes manualmente.
- `lib/rest.ts` — fábrica genérica de handlers CRUD (`EntityConfig` con `table`, `columns`, `jsonFields`, `tenant`, `requiredFields`, hooks `afterCreate`/`afterUpdate`). `requiredFields` (`{ columna: 'Etiqueta' }`) exige campos y los recorta (400 si faltan); `positiveFields` exige numéricos mayores que 0 (mismo formato de etiqueta); `uniqueConflictMessage` define el mensaje del 409 cuando un INSERT/UPDATE choca con un índice único. Las API routes de `app/api/<entidad>/` son wrappers finos sobre esta fábrica. Al agregar una entidad: DDL en `db.ts` (y `scripts/schema.sql`), config en `rest.ts` (o su route), y directorio en `app/api/`.
- **Identificadores SQL:** las columnas son camelCase y **siempre van entre comillas dobles** en el SQL (`"updatedAt"`, `"organizationId"`). PostgreSQL pliega a minúsculas los identificadores sin comillas, a diferencia de SQLite — omitir las comillas rompe la consulta.
- `scripts/pg.mjs` — mismo cliente para los scripts `.mjs` (lee `DATABASE_URL` de `.env.local`).
- `lib/api.ts` — cliente HTTP del frontend (`apiList/apiGetOne/apiCreate/apiUpdate/apiDelete`); usado por los hooks de `hooks/use-*.ts`, que a su vez alimentan las páginas.
- `lib/auth.ts` — sesión JWT firmada en cookie httpOnly (`mc_session`, 7 días). `getRequester`/`requireRequester` resuelven al usuario que llama desde la cookie; la autorización real del lado servidor se basa en `requester.role` y `requester.organizationId`, no en el estado del cliente.

**Multi-tenancy:** las tablas llevan `organizationId`; las entidades configuradas con `tenant: true` filtran automáticamente por la organización del requester.

**Autenticación en el cliente:** `contexts/auth-context.tsx` guarda el usuario en localStorage (`medical_current_user`) *y* depende de la cookie httpOnly para las llamadas API. `components/protected-route.tsx` protege rutas por rol (`allowedRoles`); rutas públicas: `/` y `/registrarse`. Roles: `super_admin`, `admin`, `doctor`, `nurse`, `receptionist` (etiquetas en `lib/roles.ts`). Importante: el rol en localStorage es solo cosmético — toda comprobación de seguridad debe hacerse en el servidor vía `requireRequester`.

**Auditoría:** `lib/audit.ts` registra operaciones; `lib/rest.ts` las invoca best-effort en cada mutation. Endpoint de consulta en `app/api/audit-log/`.

**Otros módulos de `lib/`:** `inventory-deduct.ts` (descuento de stock vía hooks `afterCreate`), `email.ts`, `schedule.ts`, `format.ts`, `app/api/cron/trial-check/` (job de vencimiento de trials).

**UI:** shadcn/ui en `components/ui/` (Radix + Tailwind), `react-hook-form` + `zod` para formularios (`components/*-form.tsx`), Recharts para reportes, sonner para notificaciones.

## Convenciones

- Todo el texto de UI y los comentarios están en español.
- Path alias `@/` → raíz del proyecto.
