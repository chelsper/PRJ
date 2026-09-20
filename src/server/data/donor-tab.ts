import { listConfigOptionsBySet, managedOptionSets, type ConfigLookupOption, type ManagedOptionSetKey } from "./configurations";
import { listDonorConnections, listDonorGiving, listDonorSoftCredits, listDonorOrganizationRelationships, listDonorNotes, listOrganizationContacts, listOrganizationRelationshipMembers } from "./donors";
import { getSmsPreference, listDonorSmsMessages } from "./sms";

export function resolveDonorTab(tab: string | undefined, donorType: string) {
  if (tab === "giving" || tab === "communications" || tab === "notes") return tab;
  if (tab === "organization" && donorType === "ORGANIZATION") return tab;
  return "profile";
}

export async function loadDonorTab(id: string, tab: ReturnType<typeof resolveDonorTab>) {
  const needsOptions = tab === "profile" || tab === "notes" || tab === "organization";
  const emptyOptions = Object.fromEntries(managedOptionSets.map((key) => [key, [] as ConfigLookupOption[]])) as Record<ManagedOptionSetKey, ConfigLookupOption[]>;
  const [connections, giving, softCredits, relationships, notes, organizationContacts, relationshipMembers, optionSets, smsPreference, smsMessages] = await Promise.all([
    tab === "profile" ? listDonorConnections(id) : [],
    tab === "giving" ? listDonorGiving(id) : [],
    tab === "giving" ? listDonorSoftCredits(id) : [],
    tab === "profile" ? listDonorOrganizationRelationships(id) : [],
    tab === "notes" ? listDonorNotes(id) : [],
    tab === "organization" ? listOrganizationContacts(id) : [],
    tab === "organization" ? listOrganizationRelationshipMembers(id) : [],
    needsOptions ? listConfigOptionsBySet() : emptyOptions,
    tab === "communications" ? getSmsPreference(id) : null,
    tab === "communications" ? listDonorSmsMessages(id) : []
  ]);
  return { connections, giving, softCredits, relationships, notes, organizationContacts, relationshipMembers, optionSets, smsPreference, smsMessages };
}
