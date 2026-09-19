import Link from "next/link";

import { ConstituentImportWorkbench } from "@/components/imports/constituent-import-workbench";
import { GiftImportWorkbench } from "@/components/imports/gift-import-workbench";
import { requireCapability } from "@/server/auth/permissions";
import { listFunds, listCampaigns } from "@/server/data/lookups";
import { query } from "@/server/db";

export default async function ImportsPage({
  searchParams
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  await requireCapability("imports:run");
  const { type } = await searchParams;
  const activeType = type === "constituents" ? "constituents" : "gifts";
  const funds = activeType === "gifts" ? await listFunds() : [];
  const campaigns = activeType === "gifts" ? await listCampaigns() : [];
  const appeals = activeType === "gifts" ? (await query<{ id: string; name: string }>("select id::text, name || coalesce(' (' || nullif(code, '') || ')', '') as name from public.appeals where archived_at is null order by name")).rows : [];

  return (
    <div className="grid">
      <nav className="tab-row">
        <Link href="/imports" className={activeType === "gifts" ? "tab-link active" : "tab-link"}>
          Gift Import
        </Link>
        <Link href="/imports?type=constituents" className={activeType === "constituents" ? "tab-link active" : "tab-link"}>
          Constituent Import
        </Link>
      </nav>

      {activeType === "constituents" ? <ConstituentImportWorkbench /> : <GiftImportWorkbench funds={funds} campaigns={campaigns} appeals={appeals} />}
    </div>
  );
}
