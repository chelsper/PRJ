import Link from "next/link";

import { DonorLookup } from "@/components/donors/donor-lookup";
import { requireCapability, getSessionWithCapability } from "@/server/auth/permissions";
import {
  listImpactCases,
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
  searchParams: Promise<{
    created?: string;
    caseQuery?: string;
    programYear?: string;
    ageBand?: string;
    county?: string;
    zipCode?: string;
    serviceStatus?: "HAS_SERVICE" | "NO_SERVICE";
  }>;
}) {
  await requireCapability("impact:read");
  const writableSession = await getSessionWithCapability("impact:write");
  const { created, caseQuery, programYear, ageBand, county, zipCode, serviceStatus } = await searchParams;
  const caseFilters = { query: caseQuery, programYear, ageBand, county, zipCode, serviceStatus };
  const [cases, services, serviceTypes] = await Promise.all([
    listImpactCases(caseFilters),
    listImpactServices(),
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
          <article className="stat"><span className="muted">Provider organizations</span><strong>{new Set(services.map((service) => service.provider_name)).size}</strong></article>
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
              <DonorLookup
                label="Provider"
                name="providerDonorId"
                required
                allowedTypes={["ORGANIZATION"]}
                placeholder="Search provider by organization name or constituent ID"
              />
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
          <div className="section-header"><div><p className="eyebrow">Patient Cases</p><h2>{cases.length} {cases.length === 1 ? "case" : "cases"}</h2></div><span className="muted">No names or contact details</span></div>
          <form action="/impact" className="table-workspace-toolbar impact-query-form">
            <label className="impact-query-search">Find patient case<input name="caseQuery" defaultValue={caseQuery ?? ""} placeholder="Case number or external reference" /></label>
            <label>Year<input name="programYear" type="number" min="2000" max="2100" defaultValue={programYear ?? ""} /></label>
            <label>Age band<select name="ageBand" defaultValue={ageBand ?? ""}><option value="">All ages</option><option>Under 40</option><option>40-49</option><option>50-64</option><option>65+</option></select></label>
            <label>County<input name="county" defaultValue={county ?? ""} /></label>
            <label>ZIP code<input name="zipCode" defaultValue={zipCode ?? ""} /></label>
            <label>Service status<select name="serviceStatus" defaultValue={serviceStatus ?? ""}><option value="">All cases</option><option value="HAS_SERVICE">Has services</option><option value="NO_SERVICE">No services yet</option></select></label>
            <div className="table-workspace-actions"><button type="submit">Search</button><Link href="/impact" className="button-link secondary-link">Clear</Link></div>
          </form>
          <div className="table-scroll"><table><thead><tr><th>Case</th><th>Year</th><th>Age</th><th>Location</th><th>Services</th></tr></thead><tbody>
            {cases.length ? cases.map((patientCase) => <tr key={patientCase.id} className="table-row-actionable"><td>{patientCase.case_number}</td><td>{patientCase.program_year}</td><td>{patientCase.age_at_intake ?? patientCase.age_band ?? "-"}</td><td>{[patientCase.county, patientCase.zip_code].filter(Boolean).join(" · ") || "-"}</td><td>{patientCase.service_count}</td></tr>) : <tr><td colSpan={5} className="table-empty-state">No patient cases match these filters.</td></tr>}
          </tbody></table></div>
        </article>
        <article className="table-shell">
          <div className="section-header"><div><p className="eyebrow">Service Records</p><h2>{services.length} {services.length === 1 ? "service" : "services"}</h2></div><Link className="inline-link" href="/donors">Manage providers</Link></div>
          <div className="table-scroll"><table><thead><tr><th>Date</th><th>Case</th><th>Provider</th><th>Service</th><th>Paid</th></tr></thead><tbody>
            {services.length ? services.map((service) => <tr key={service.id} className="table-row-actionable"><td>{service.service_date}</td><td>{service.case_number}</td><td>{service.provider_name}</td><td>{service.service_type_name}</td><td>{formatMoney(service.amount_paid_cents)}</td></tr>) : <tr><td colSpan={5} className="table-empty-state">No service records have been entered yet.</td></tr>}
          </tbody></table></div>
        </article>
      </section>
    </div>
  );
}
