export type QualityDonor = {
  id: string; donor_number: string; donor_type: string; full_name: string;
  primary_email: string | null; alternate_email: string | null; primary_phone: string | null;
  spouse_donor_id: string | null;
};

const normalize = (value: string | null) => (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
function phone(value: string | null) {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

export function contactIssues(donor: QualityDonor): string[] {
  const issues: string[] = [];
  if (![donor.primary_email, donor.alternate_email, donor.primary_phone].some(value => value?.trim())) issues.push("No email or phone");
  for (const [label, value] of [["Primary email", donor.primary_email], ["Alternate email", donor.alternate_email]]) {
    if (value?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) issues.push(`${label}: check format`);
  }
  if (donor.primary_phone?.trim() && (phone(donor.primary_phone).length < 7 || phone(donor.primary_phone).length > 15)) issues.push("Phone: check format");
  return issues;
}

export function duplicateReasons(a: QualityDonor, b: QualityDonor): string[] {
  if (a.id === b.id || a.donor_type !== b.donor_type || a.spouse_donor_id === b.id || b.spouse_donor_id === a.id) return [];
  const sameName = !!normalize(a.full_name) && normalize(a.full_name) === normalize(b.full_name);
  const emails = [a.primary_email, a.alternate_email].map(normalize).filter(Boolean);
  const sameEmail = [b.primary_email, b.alternate_email].map(normalize).some(value => !!value && emails.includes(value));
  const samePhone = phone(a.primary_phone).length >= 7 && phone(a.primary_phone) === phone(b.primary_phone);
  if (!(sameName && (sameEmail || samePhone)) && !(sameEmail && samePhone)) return [];
  return [sameName ? "Same full name" : "", sameEmail ? "Same email" : "", samePhone ? "Same phone" : ""].filter(Boolean);
}

export function findDuplicatePairs(donors: QualityDonor[], limit = 100) {
  const buckets = new Map<string, QualityDonor[]>();
  const pairs: { left: QualityDonor; right: QualityDonor; reasons: string[] }[] = [];
  for (const donor of donors) {
    const keys = [...new Set([donor.primary_email, donor.alternate_email].map(normalize).filter(Boolean).map(value => `email:${value}`))];
    if (phone(donor.primary_phone).length >= 7) keys.push(`phone:${phone(donor.primary_phone)}`);
    const seen = new Set<string>();
    for (const key of keys) {
      for (const other of buckets.get(key) ?? []) {
        if (seen.has(other.id)) continue;
        seen.add(other.id);
        const reasons = duplicateReasons(donor, other);
        if (reasons.length) {
          pairs.push({ left: other, right: donor, reasons });
          if (pairs.length >= limit) return pairs;
        }
      }
    }
    for (const key of keys) buckets.set(key, [...(buckets.get(key) ?? []), donor]);
  }
  return pairs;
}
