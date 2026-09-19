import { expect, it } from "vitest";
import { reviewSmsAudience } from "@/lib/sms-audience";
const person = (id: string, consent = "OPTED_IN", phone: string | null = "+19045550100") => ({ id, name: id, consent, phone });
it("selects only one eligible profile per number", () => {
  expect(reviewSmsAudience([person("1"), person("2")]).map(row => row.eligible)).toEqual([true, false]);
});
it("blocks missing consent and invalid or missing phones", () => {
  expect(reviewSmsAudience([person("1", "UNKNOWN"), person("2", "OPTED_IN", null), person("3", "OPTED_IN", "904")]).every(row => !row.eligible)).toBe(true);
});
it("suppresses all profiles sharing an opted-out number", () => {
  expect(reviewSmsAudience([person("1"), person("2", "OPTED_OUT")]).every(row => !row.eligible)).toBe(true);
});
