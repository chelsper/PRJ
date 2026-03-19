import { GiftImportWorkbench } from "@/components/imports/gift-import-workbench";
import { requireCapability } from "@/server/auth/permissions";
import { listAppeals, listCampaigns, listFunds } from "@/server/data/lookups";

export default async function ImportsPage() {
  await requireCapability("gifts:write");
  const [funds, campaigns, appeals] = await Promise.all([listFunds(), listCampaigns(), listAppeals()]);

  return (
    <GiftImportWorkbench funds={funds} campaigns={campaigns} appeals={appeals} />
  );
}
