import Link from "next/link";

import { requireCapability, getSessionWithCapability } from "@/server/auth/permissions";
import {
  listImpactCases,
  listImpactProviders,
  listImpactServices,
  listImpactServiceTypes
} from "@/server/data/impact";

import { createPatientCaseAction, createServiceRecordAction } from "./actions";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default async function ImpactPage({
  searchParams
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  await requireCapability("impact:read");
  const writableSession = await getSessionWithCapability("impact:write");
  const { created } = await searchParams;
  const [cases, services, providers, serviceTypes] = await Promise.all([
    listImpactCases(),
    listImpactServices(),
    listImpactProviders(),
    listImpactServiceTypes()
  ]);
  const currentYear = new Date().getFullYear();

  return (
    <div className="grid impact-page">
      <section className="hero impact-hero">
        <p className="eyebrow">Community Impact</p>
        <h1>Patient Outcomes</h1>
        <p className="muted">
          Track de-identified community service access, provider charges, and outcomes without placing patient identities in the donor CRM.
        </p>
        <div className="stats impact-summary-stats">
          <article className="stat"><span className="muted">Patient cases</span><strong>{cases.length}</strong></article>
          <article className="stat"><span className="muted">Service records</span><strong>{services.length}</strong></article>
          <article className="stat"><span className="muted">Provider organizations</span><strong>{providers.length}</strong></article>
        </div>
      </section>

      {created ? <p className="success-callout">{created === "case" ? "Patient case created." : "Service record added."}</p> : null}

      {writableSession ? (
        <section className="grid grid-2 impact-entry-grid">
          <article className="card">
            <p className="eyebrow">Patient Case</p>
            <h2>Create anonymous case</h2>
            <p className="muted">Use age at intake, not date of birth. Do not enter a patient name, email, or phone number.</p>
            <form action={createPatientCaseAction} className="form-grid">
              <label>Program year<input name="programYear" type="number" min="2000" max="2100" defaultValue={currentYear} required /></label>
              <label>External patient reference<input name="externalPatientRef" maxLength={100} /></label>
              <label>Sex<select name="sex"><option value="">Not recorded</option><option>Female</option><option>Male</option><option>Intersex</option><option>Unknown</option><option>Prefer not to say</option></select></label>
              <label>Age at intake<input name="ageAtIntake" type="number" min="0" max="120" /></label>
              <label>Age band<select name="ageBand"><option value="">Not recorded</option><option>Under 40</option><option>40-49</option><option>50-64</option><option>65+</option></select></label>
              <label>Race / ethnicity<input name="raceEthnicity" maxLength={100} /></label>
              <label>County<input name="county" maxLength={100} /></label>
              <label>ZIP code<input name="zipCode" maxLength={20} /></label>
              <label>Preferred language<input name="preferredLanguage" maxLength={100} /></label>
              <label>Insurance status<input name="insuranceStatus" maxLength={100} /></label>
              <label>Referral source<input name="referralSource" maxLength={150} /></label>
              <label>Referring clinic<input name="referringClinic" maxLength={200} /></label>
              <label>First service date<input name="firstServiceDate" type="date" /></label>
              <label>Last service date<input name="lastServiceDate" type="date" /></label>
              <label className="full">Internal notes<textarea name="notes" rows={3} /></label>
              <div className="full"><button type="submit">Create patient case</button></div>
            </form>
          </article>

          <article className="card">
            <p className="eyebrow">Service Record</p>
            <h2>Record provider service</h2>
            <p className="muted">Providers are existing organization constituent records. Add a provider in Donors first if it is not listed.</p>
            <form action={createServiceRecordAction} className="form-grid">
              <label>Patient case<select name="patientCaseId" required><option value="">Select case</option>{cases.map((patientCase) => <option key={patientCase.id} value={patientCase.id}>{patientCase.case_number} · {patientCase.program_year}</option>)}</select></label>
              <label>Provider<select name="providerDonorId" required><option value="">Select provider</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label>
              <label>Service type<select name="serviceTypeId" required><option value="">Select service</option>{serviceTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
              <label>Service date<input name="serviceDate" type="date" required /></label>
              <label>Invoice date<input name="invoiceDate" type="date" /></label>
              <label>Invoice number<input name="invoiceNumber" maxLength={100} /></label>
              <label>Amount charged<input name="amountCharged" type="number" min="0" step="0.01" defaultValue="0" required /></label>
              <label>Amount paid<input name="amountPaid" type="number" min="0" step="0.01" defaultValue="0" required /></label>
              <label>Amount written off<input name="amountWrittenOff" type="number" min="0" step="0.01" defaultValue="0" required /></label>
              <label>Funding source<input name="fundingSource" maxLength={150} /></label>
              <label className="full">Internal notes<textarea name="notes" rows={3} /></label>
              <div className="full"><button type="submit">Save service record</button></div>
            </form>
          </article>
        </section>
      ) : <section className="card"><p className="eyebrow">Read Only</p><p>You can review community impact records but cannot add or change them.</p></section>}

      <section className="grid grid-2 impact-record-grid">
        <article className="table-shell">
          <div className="section-header"><div><p className="eyebrow">Patient Cases</p><h2>Recent cases</h2></div><span className="muted">No names or contact details</span></div>
          <table><thead><tr><th>Case</th><th>Year</th><th>Age</th><th>Location</th><th>Services</th></tr></thead><tbody>
            {cases.length ? cases.map((patientCase) => <tr key={patientCase.id}><td>{patientCase.case_number}</td><td>{patientCase.program_year}</td><td>{patientCase.age_at_intake ?? patientCase.age_band ?? "-"}</td><td>{[patientCase.county, patientCase.zip_code].filter(Boolean).join(" · ") || "-"}</td><td>{patientCase.service_count}</td></tr>) : <tr><td colSpan={5} className="muted">No patient cases yet.</td></tr>}
          </tbody></table>
        </article>
        <article className="table-shell">
          <div className="section-header"><div><p className="eyebrow">Service Records</p><h2>Recent services</h2></div><Link className="inline-link" href="/donors">Manage providers</Link></div>
          <table><thead><tr><th>Date</th><th>Case</th><th>Provider</th><th>Service</th><th>Paid</th></tr></thead><tbody>
            {services.length ? services.map((service) => <tr key={service.id}><td>{service.service_date}</td><td>{service.case_number}</td><td>{service.provider_name}</td><td>{service.service_type_name}</td><td>{formatMoney(service.amount_paid_cents)}</td></tr>) : <tr><td colSpan={5} className="muted">No service records yet.</td></tr>}
          </tbody></table>
        </article>
      </section>
    </div>
  );
}
