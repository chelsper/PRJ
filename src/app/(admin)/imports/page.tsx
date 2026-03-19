import Link from "next/link";

import { ConstituentImportWorkbench } from "@/components/imports/constituent-import-workbench";
import { GiftImportWorkbench } from "@/components/imports/gift-import-workbench";
import { requireCapability } from "@/server/auth/permissions";

export default async function ImportsPage({
  searchParams
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  await requireCapability("donors:write");
  const { type } = await searchParams;
  const activeType = type === "constituents" ? "constituents" : "gifts";

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

      {activeType === "constituents" ? <ConstituentImportWorkbench /> : <GiftImportWorkbench />}
    </div>
  );
}
