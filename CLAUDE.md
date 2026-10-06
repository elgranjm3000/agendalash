# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

MediControl / AgendaLash — sistema de gestión médica (Next.js 13 App Router + TypeScript, UI en español). Frontend SPA con backend en API routes y persistencia en Turso (libSQL/SQLite). No hay suite de tests.

## Comandos

```bash
npm run dev     # desarrollo en http://localhost:3000
npm run build   # build de producción
npm run lint    # ESLint
node scripts/seed-demo.mjs   # siembra datos demo (idempotente; lee .env.local)
```

Variables de entorno (`.env.local`): `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET`.

## Arquitectura

**Capa de datos compartida entre frontend y backend vía convención de nombres:**

- `lib/types.ts` define los modelos (User, Patient, Appointment, Prescription, Invoice, etc.). Los nombres de entidad usados en rutas API (`/api/patients`) y en el cliente (`apiList('patients')`) coinciden con los directorios en `app/api/`.
- `lib/db.ts` — cliente Turso + `ensureDb()`: crea el esquema y usuarios por defecto en la primera consulta (lazy, memoizado). Columnas SQL en camelCase entre comillas (`"organizationId"`); las tablas se crean con `CREATE TABLE IF NOT EXISTS` — **no hay migraciones**: cambios de esquema requieren editar los DDL y manejar la migración de datos existentes manualmente.
- `lib/rest.ts` — fábrica genérica de handlers CRUD (`EntityConfig` con `table`, `columns`, `jsonFields`, `tenant`, hooks `afterCreate`/`afterUpdate`). Las API routes de `app/api/<entidad>/` son wrappers finos sobre esta fábrica. Al agregar una entidad: DDL en `db.ts`, config en `rest.ts` (o su route), y directorio en `app/api/`.
- `lib/api.ts` — cliente HTTP del frontend (`apiList/apiGetOne/apiCreate/apiUpdate/apiDelete`); usado por los hooks de `hooks/use-*.ts`, que a su vez alimentan las páginas.
- `lib/auth.ts` — sesión JWT firmada en cookie httpOnly (`mc_session`, 7 días). `getRequester`/`requireRequester` resuelven al usuario que llama desde la cookie; la autorización real del lado servidor se basa en `requester.role` y `requester.organizationId`, no en el estado del cliente.

**Multi-tenancy:** las tablas llevan `organizationId`; las entidades configuradas con `tenant: true` filtran automáticamente por la organización del requester.

**Autenticación en el cliente:** `contexts/auth-context.tsx` guarda el usuario en localStorage (`medical_current_user`) *y* depende de la cookie httpOnly para las llamadas API. `components/protected-route.tsx` protege rutas por rol (`allowedRoles`); rutas públicas: `/` y `/registrarse`. Roles: `super_admin`, `admin`, `doctor`, `nurse`, `receptionist` (etiquetas en `lib/roles.ts`). Importante: el rol en localStorage es solo cosmético — toda comprobación de seguridad debe hacerse en el servidor vía `requireRequester`.

**Auditoría:** `lib/audit.ts` registra operaciones; `lib/rest.ts` las invoca best-effort en cada mutation. Endpoint de consulta en `app/api/audit-log/`.

**Otros módulos de `lib/`:** `inventory-deduct.ts` (descuento de stock vía hooks `afterCreate`), `exchange.ts` + `app/api/exchange-rate/` (tasas de cambio), `email.ts`, `schedule.ts`, `format.ts`, `app/api/cron/trial-check/` (job de vencimiento de trials).

**UI:** shadcn/ui en `components/ui/` (Radix + Tailwind), `react-hook-form` + `zod` para formularios (`components/*-form.tsx`), Recharts para reportes, sonner para notificaciones.

## Convenciones

- Todo el texto de UI y los comentarios están en español.
- Path alias `@/` → raíz del proyecto.
