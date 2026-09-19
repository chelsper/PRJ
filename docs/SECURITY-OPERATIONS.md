# Security operations and remaining deployment gates

Updated 2026-09-19. This is not a certification or penetration-test report.

## Implemented in this change

- Next.js 15.5.25 and patched transitive dependencies; Vitest 4.1.11.
- CSV cells beginning with formula/control prefixes are exported as literal text.
- Export totals no longer multiply a gift for multiple soft-credit recipients.
- Production PostgreSQL connections explicitly use verify-full; pool size,
  connection wait, statement duration, lock wait and idle transactions are bounded.
- Authenticated export POSTs require a trusted origin. Trusted origins come from
  APP_URL and Vercel deployment environment, never client-forwarded host values.
- Imports require an admin-only capability and bounded, allowlisted payloads.
- Atomic database-backed rate-limit reservations for authentication, invitations,
  exports, constituent imports (5/15 minutes) and SMS (20/15 minutes per user).
  Missing/unavailable security tables fail closed.
- Import audit reservations reject repeated mapped batches, including renamed
  files and reordered rows. This is not row-level source-ID deduplication.
- Signed sessions have a validated issuer, audience, algorithm, claims, expiry and
  unique ID. Logout revokes the current session; admins can revoke all sessions.
  Access changes revoke existing sessions. Old tokens require a new login.
- Last-admin removal is serialized and audited within its update transaction.
- Main donor-profile saves compare the loaded donor timestamp under a row lock.
  Conflicts return an error rather than overwriting the newer donor row.
  Separate address/relationship/gift editors still need equivalent conflict checks.

## Verification limits

The local DATABASE_URL failed DNS resolution. A subsequent read-only production
check using the existing Vercel configuration succeeded: APP_URL is the public
CRM origin and public.audit_log/public.rate_limit_events exist. The app role
owns tables and has CREATEROLE, CREATEDB and BYPASSRLS privileges: this remains a
high-priority least-privilege risk. No production credentials, privileges, backup
settings, data or retention were changed. Database-backed behavior has unit/mock
coverage, not live concurrency or restore validation. Export SQL passed EXPLAIN
against the production schema and a read-only synthetic multiple-soft-credit
fixture; no real donor rows were fetched for these tests.

## Backup and disaster-recovery drill

1. In Neon, record the production project/branch and configured restore window.
   Agree on maximum tolerable data loss and recovery time with the owner.
2. Create a separate restricted recovery branch from a historical point inside
   that window. Never restore over production for a drill.
3. Connect a nonproduction deployment using separate credentials. Disable all
   SMS, email and scheduled work there. Restrict access because branch data is
   still sensitive, even if names are omitted.
4. Check record counts, foreign keys, sampled giving balances and application
   login/read operations. Record recovery duration and discrepancy results.
5. Document owner approval and remove drill resources according to the agreed
   retention policy. Do not delete audit evidence of the drill.

Neon reference: https://neon.com/docs/manage/branches

## Database least privilege

Run sql/security/read-only-assessment.sql first. Use separate owner credentials
for migrations and a nonowner login for the app. Grant only necessary schema
usage, table SELECT/INSERT/UPDATE and sequence access; review actual DELETE uses
before revoking them. The app should have INSERT/SELECT but no UPDATE/DELETE on
audit history. Test the new role on a staging branch, then switch DATABASE_URL
and redeploy. Keep a verified rollback credential until smoke tests pass. Never
revoke the current owner or rotate credentials blindly.

## Still required

- MFA: select a maintained identity provider or vetted WebAuthn/TOTP solution;
  enroll administrators, issue recovery codes, test recovery, then enforce.
  No MFA implementation or enrollment was added in this pass.
- Separate production/staging databases and provider credentials; no real SMS
  senders in previews. Use anonymized fixtures instead of live data for routine tests.
- Patient/impact access is now admin-only. Define the staff access matrix before
  adding explicit grants, then test APIs, search and exports.
  Do not treat donor-query permissions as authorization for patient data.
- Source IDs: add unique (source, source account, source record ID) mappings for
  contacts and gifts before enabling Givebutter gift creation. Store IDs as text.
  Review cross-source matches; never merge on shared email/address alone.
- Retention: set approved retention periods for uploads, messages, audit logs
  and rate-limit events. No automatic deletion was enabled. Revocation/import
  reservations currently rely on audit history; preserve these records.
- Audit: app restrictions cannot make logs immutable to database owners. Use
  an independently restricted log sink for tamper resistance and alerting.
- Monitoring: configure alerts for provider failures, unauthorized exports,
  repeated login failures and import errors. The app does not provide a new
  external alerting integration yet.
- SMS retries: same donor/body/category/phone/schedule within 15 minutes reuse an
  existing nonfailed message. Accepted messages are not resubmitted. Uncertain
  network submissions remain SENDING and require provider reconciliation.
  This is a bounded retry guard, not a complete durable outbox design.
- Broad optimistic concurrency, safe undelete, durable SMS idempotency and
  database integration tests remain follow-up work.

## Release checklist

Run npm ci --ignore-scripts, npm test, npm run build and npm audit. Verify the
database assessment and trusted origin, deploy, then exercise admin login,
logout/revocation, staff restrictions, a read-only export, profile conflict and
the import preview with synthetic data. No real texts or bulk imports are
needed for this check. Keep the prior deployment as a rollback target, noting
that rollback also restores its known vulnerabilities.
