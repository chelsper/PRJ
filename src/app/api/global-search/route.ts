import { NextResponse } from "next/server";

import { getCurrentSession } from "@/server/auth/session-store";
import { roleHasCapability } from "@/server/auth/roles";
import { query } from "@/server/db";

type GlobalSearchResult = {
  id: string;
  type: "constituent" | "provider" | "gift" | "patient_case";
  title: string;
  detail: string;
  href: string;
};

export async function GET(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const search = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (search.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results: GlobalSearchResult[] = [];

  if (roleHasCapability(session.role, "donors:read")) {
    const donorResults = await query<{
      id: string;
      donor_number: string | null;
      donor_type: "INDIVIDUAL" | "ORGANIZATION";
      display_name: string;
      primary_email: string | null;
    }>(
      `select
         d.id::text,
         d.donor_number,
         d.donor_type,
         case
           when d.donor_type = 'ORGANIZATION' then d.organization_name
           else coalesce(nullif(concat_ws(' ', d.preferred_name, d.last_name), ''), concat_ws(' ', d.first_name, d.last_name))
         end as display_name,
         d.primary_email::text
       from public.donors d
       where d.deleted_at is null
         and (
           d.donor_number ilike '%' || $1 || '%'
           or d.primary_email::text ilike '%' || $1 || '%'
           or d.organization_name ilike '%' || $1 || '%'
           or d.first_name ilike '%' || $1 || '%'
           or d.last_name ilike '%' || $1 || '%'
           or d.preferred_name ilike '%' || $1 || '%'
           or concat_ws(' ', d.first_name, d.last_name) ilike '%' || $1 || '%'
         )
       order by d.organization_name nulls last, d.last_name nulls last, d.first_name nulls last
       limit 8`,
      [search]
    );

    results.push(
      ...donorResults.rows.map((donor) => ({
        id: `donor-${donor.id}`,
        type: (donor.donor_type === "ORGANIZATION" ? "provider" : "constituent") as "provider" | "constituent",
        title: donor.display_name || "Unnamed constituent",
        detail: [donor.donor_type === "ORGANIZATION" ? "Organization / provider" : "Constituent", donor.donor_number ?? "Pending ID", donor.primary_email].filter(Boolean).join(" · "),
        href: `/donors/${donor.id}`
      }))
    );
  }

  if (roleHasCapability(session.role, "gifts:read")) {
    const giftResults = await query<{
      id: string;
      gift_number: string | null;
      gift_date: string;
      amount_cents: number;
      donor_name: string;
    }>(
      `select
         g.id::text,
         g.gift_number,
         g.gift_date::text,
         g.amount_cents,
         coalesce(nullif(d.organization_name, ''), concat_ws(' ', d.first_name, d.last_name), d.donor_number) as donor_name
       from public.gifts g
       join public.donors d on d.id = g.donor_id
       where g.deleted_at is null
         and (
           g.gift_number ilike '%' || $1 || '%'
           or coalesce(nullif(d.organization_name, ''), concat_ws(' ', d.first_name, d.last_name)) ilike '%' || $1 || '%'
         )
       order by g.gift_date desc, g.id desc
       limit 6`,
      [search]
    );

    results.push(
      ...giftResults.rows.map((gift) => ({
        id: `gift-${gift.id}`,
        type: "gift" as const,
        title: `Gift ${gift.gift_number ?? ""}`.trim(),
        detail: `${gift.donor_name} · ${gift.gift_date} · ${(gift.amount_cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}`,
        href: `/gifts/${gift.id}/edit`
      }))
    );
  }

  if (roleHasCapability(session.role, "impact:read")) {
    const caseResults = await query<{
      id: string;
      case_number: string;
      program_year: number;
      age_at_intake: number | null;
      county: string | null;
      zip_code: string | null;
    }>(
      `select id::text, case_number, program_year, age_at_intake, county, zip_code
       from public.patient_cases
       where case_number ilike '%' || $1 || '%'
          or external_patient_ref ilike '%' || $1 || '%'
          or county ilike '%' || $1 || '%'
          or zip_code ilike '%' || $1 || '%'
       order by created_at desc
       limit 6`,
      [search]
    );

    results.push(
      ...caseResults.rows.map((patientCase) => ({
        id: `case-${patientCase.id}`,
        type: "patient_case" as const,
        title: patientCase.case_number,
        detail: ["Patient case", String(patientCase.program_year), patientCase.age_at_intake ? `Age ${patientCase.age_at_intake}` : null, patientCase.county, patientCase.zip_code].filter(Boolean).join(" · "),
        href: `/impact?caseQuery=${encodeURIComponent(patientCase.case_number)}`
      }))
    );
  }

  return NextResponse.json({ results: results.slice(0, 16) });
}
