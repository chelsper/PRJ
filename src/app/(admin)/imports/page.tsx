import { requireCapability } from "@/src/server/auth/permissions";

export default async function ImportsPage() {
  await requireCapability("donors:write");

  return (
    <section className="card">
      <p className="eyebrow">Imports</p>
      <h1>Imports are intentionally gated</h1>
      <p className="muted">
        Batch import is left as a follow-up so validation, deduplication, and audit requirements can be implemented
        before bulk donor data enters the system.
      </p>
    </section>
  );
}
