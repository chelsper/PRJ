# Neon backup upgrade for review

Reviewed in the authenticated PRJ Database billing console, September 19, 2026.
No paid plan was selected or purchased.

## Current protection

- Free plan, six-hour point-in-time recovery history.
- One manual production snapshot created September 20, 2026 at 00:10:17 UTC.
  The console displays no expiration for this snapshot.
- Snapshot restored to separate branch `br-curly-sky-a4kgg3kp`.
  Production was not overwritten and its connections were not migrated.
- Read-only checks matched donor, gift, patient-case and user counts and gift
  amount totals. Restored gifts had no missing donor references.
- No automated backup schedule. The console requires an upgrade for schedules
  and additional snapshots. A restored branch is not a separate-provider backup.
- Recovery branch contains sensitive production data. It is not configured as
  an application deployment or as routine preview data. Keep access restricted.

## Recommended next purchase to review: Launch

The console lists Launch as usage-based, with Postgres compute at $0.106/CU-hour
and storage at $0.35/GB-month. It includes longer point-in-time restore and
protected branches. These are rates, not an estimate of your monthly bill;
history, transfer and other usage can add costs. Confirm current rates and the
available restore-window/snapshot limits before accepting checkout.

After approval, target a seven-day recovery window and a daily snapshot schedule
if supported by the selected plan. Confirm backup retention and spending limits
in the plan configuration; do not assume these settings activate automatically.

## When to review Scale instead

The console lists Scale compute at $0.222/CU-hour and storage at $0.35/GB-month,
with additional networking and compliance options. If identifiable patient data
will be stored, review the necessary agreements and architecture with qualified
privacy/security support before choosing a plan. A paid tier alone does not make
the CRM compliant, and removing names alone does not necessarily de-identify data.

Official comparison: https://neon.com/pricing

## Decisions still needed

- Approve a plan and acceptable monthly spending range.
- Confirm retention targets, tolerable data loss and recovery time.
- Decide on encrypted independent backups and who holds recovery keys.
- Authorize retirement of the restored test branch after recovery evidence is
  accepted. It is intentionally retained for now; no production records deleted.
