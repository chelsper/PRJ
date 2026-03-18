# Nonprofit CRM Admin

This repository is now a Next.js TypeScript skeleton for a secure, admin-only donor database on Vercel with Neon Postgres.

## Current architecture

- Next.js app router with server-rendered admin pages in [`/Users/chelseasantoro/Downloads/anything-nonprofit-crm-db/src/app`](/Users/chelseasantoro/Downloads/anything-nonprofit-crm-db/src/app)
- Single server-side data layer in [`/Users/chelseasantoro/Downloads/anything-nonprofit-crm-db/src/server/data`](/Users/chelseasantoro/Downloads/anything-nonprofit-crm-db/src/server/data)
- Server-side auth, roles, and session helpers in [`/Users/chelseasantoro/Downloads/anything-nonprofit-crm-db/src/server/auth`](/Users/chelseasantoro/Downloads/anything-nonprofit-crm-db/src/server/auth)
- Audit logging and rate-limit helpers in [`/Users/chelseasantoro/Downloads/anything-nonprofit-crm-db/src/server/audit`](/Users/chelseasantoro/Downloads/anything-nonprofit-crm-db/src/server/audit) and [`/Users/chelseasantoro/Downloads/anything-nonprofit-crm-db/src/server/security`](/Users/chelseasantoro/Downloads/anything-nonprofit-crm-db/src/server/security)
- Normalized PostgreSQL schema and reporting views in [`/Users/chelseasantoro/Downloads/anything-nonprofit-crm-db/sql/schema.sql`](/Users/chelseasantoro/Downloads/anything-nonprofit-crm-db/sql/schema.sql)

## Security posture

- No database credentials are exposed to the browser.
- All database reads and writes are server-side.
- Queries are parameterized.
- Writes are validated with Zod.
- Roles are `admin`, `staff`, and `read_only`.
- Access is denied by default through server-side capability checks.
- Soft delete is used for donors.
- Audit log hooks are present for login, donor creation, gift creation, deletes, and exports.
- Rate limiting is included for login and CSV export flows.
- Secure headers and a strict CSP are configured in [`/Users/chelseasantoro/Downloads/anything-nonprofit-crm-db/next.config.ts`](/Users/chelseasantoro/Downloads/anything-nonprofit-crm-db/next.config.ts).

This is still a starter, not a finished compliance program. It improves least privilege and defense in depth, but it should not be described as unhackable.

## Required environment variables

- `DATABASE_URL`
- `SESSION_SECRET`
- `APP_URL`
- `RATE_LIMIT_WINDOW_SECONDS`
- `RATE_LIMIT_MAX_AUTH_ATTEMPTS`
- `RATE_LIMIT_MAX_EXPORTS`

Use Vercel project settings for all secrets. Do not commit real values.

## Neon and Vercel order

1. Create the Neon project and separate databases or roles for development, preview, and production.
2. Apply [`/Users/chelseasantoro/Downloads/anything-nonprofit-crm-db/sql/schema.sql`](/Users/chelseasantoro/Downloads/anything-nonprofit-crm-db/sql/schema.sql).
3. Optionally apply [`/Users/chelseasantoro/Downloads/anything-nonprofit-crm-db/sql/seed.sql`](/Users/chelseasantoro/Downloads/anything-nonprofit-crm-db/sql/seed.sql) after replacing the placeholder password hash.
4. For fake donor testing data, run [`/Users/chelseasantoro/Downloads/anything-nonprofit-crm-db/sql/sample_data.sql`](/Users/chelseasantoro/Downloads/anything-nonprofit-crm-db/sql/sample_data.sql) in a non-production database.
5. On an existing database, apply [`/Users/chelseasantoro/Downloads/anything-nonprofit-crm-db/sql/migrations/20260318_donor_profiles.sql`](/Users/chelseasantoro/Downloads/anything-nonprofit-crm-db/sql/migrations/20260318_donor_profiles.sql) before using the donor profile pages.
6. On an existing database, apply [`/Users/chelseasantoro/Downloads/anything-nonprofit-crm-db/sql/migrations/20260318_gift_ids_soft_credits.sql`](/Users/chelseasantoro/Downloads/anything-nonprofit-crm-db/sql/migrations/20260318_gift_ids_soft_credits.sql) before using the gift edit and soft-credit features.
7. Import the repo into Vercel.
8. Configure environment variables separately for development, preview, and production.
9. Never reuse production credentials in preview.

## Remaining follow-up work

- Replace the built-in `scrypt` password helper with Argon2id before real use.
- Add user management flows for invite/reset/disable.
- Add saved filters, yearly reports, LYBUNT/SYBUNT calculations, and imports.
- Add database-generated TypeScript types if you adopt a migration workflow or codegen tool.
- Add more test coverage for reporting calculations and authorization edges.

## Local development

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set local-only environment variables.
4. Run `npm run dev`.

I could not run the app in this shell because `node` is not installed here.
