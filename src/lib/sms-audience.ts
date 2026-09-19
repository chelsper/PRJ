export type AudienceProfile = { id: string; name: string; phone: string | null; consent: string | null };

export function reviewSmsAudience(profiles: AudienceProfile[]) {
  const seen = new Set<string>();
  return profiles.map(profile => {
    const phone = profile.phone?.trim() ?? "";
    let reason = "";
    if (profile.consent === "OPTED_OUT") reason = "Opted out";
    else if (profile.consent !== "OPTED_IN") reason = "Consent not documented";
    else if (!phone) reason = "No saved texting number";
    else if (!/^\+[1-9]\d{7,14}$/.test(phone)) reason = "Invalid texting number";
    else if (profiles.some(other => other.phone?.trim() === phone && other.consent === "OPTED_OUT")) reason = "Shared number has an opt-out";
    else if (seen.has(phone)) reason = "Duplicate phone number";
    if (!reason) seen.add(phone);
    return { ...profile, phone, eligible: !reason, reason: reason || "Eligible for review" };
  });
}
