import { describe, expect, it } from "vitest";
import { contactIssues, duplicateReasons, findDuplicatePairs, type QualityDonor } from "@/server/data/data-quality-rules";

const a: QualityDonor = { id: "1", donor_number: "500001", donor_type: "INDIVIDUAL", full_name: "Faith Collins",
  primary_email: "faith@example.org", alternate_email: null, primary_phone: "904-555-1234", spouse_donor_id: null };
const b = { ...a, id: "2", donor_number: "500002" };
describe("data quality review", () => {
  it("normalizes names, email and US phone formatting", () => {
    expect(duplicateReasons(a, { ...b, full_name: " FAITH  COLLINS ", primary_email: " FAITH@example.org ", primary_phone: "+1 (904) 555-1234" })).toHaveLength(3);
  });
  it("does not flag same name alone or same email alone", () => {
    expect(duplicateReasons(a, { ...b, primary_email: null, primary_phone: null })).toEqual([]);
    expect(duplicateReasons(a, { ...b, full_name: "John Collins", primary_phone: null })).toEqual([]);
  });
  it("excludes linked spouses in either direction and different record types", () => {
    expect(duplicateReasons(a, { ...b, spouse_donor_id: a.id })).toEqual([]);
    expect(duplicateReasons({ ...a, spouse_donor_id: b.id }, b)).toEqual([]);
    expect(duplicateReasons(a, { ...b, donor_type: "ORGANIZATION" })).toEqual([]);
  });
  it("matches alternate email and returns each pair once", () => {
    expect(findDuplicatePairs([a, { ...b, primary_email: null, alternate_email: a.primary_email }])).toHaveLength(1);
    expect(findDuplicatePairs([a, b, { ...b, id: "3" }], 2)).toHaveLength(2);
  });
  it("does not match blank details", () => {
    const empty = { ...a, full_name: "", primary_email: null, primary_phone: null };
    expect(findDuplicatePairs([empty, { ...empty, id: "2" }])).toEqual([]);
    expect(contactIssues(empty)).toEqual(["No email or phone"]);
  });
  it("skips dismissed pairs before applying the result limit", () => {
    expect(findDuplicatePairs([a, b, { ...b, id: "3" }], 1, new Set(["1:2"]))[0].right.id).toBe("3");
  });
  it("flags format concerns but accepts optional missing fields", () => {
    expect(contactIssues({ ...a, primary_phone: null })).toEqual([]);
    expect(contactIssues({ ...a, primary_email: "broken", primary_phone: "12" })).toHaveLength(2);
  });
});
