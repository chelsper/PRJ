import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/server/db", () => ({ query: db.query, transaction: vi.fn() }));
vi.mock("@/server/audit", () => ({ writeAuditLog: vi.fn() }));
import { markSmsSent, updateSmsDelivery } from "@/server/data/sms";

beforeEach(() => db.query.mockReset());
describe("SMS status SQL parameter types", () => {
  it.each([true, false])("uses a consistent status parameter type for scheduled=%s", async scheduled => {
    await markSmsSent("1", "SM_test", scheduled);
    const [sql, values] = db.query.mock.calls[0];
    expect(sql.match(/\$3/g)).toHaveLength(2);
    expect(sql.match(/\$3::varchar\(20\)/g)).toHaveLength(2);
    expect(values).toEqual([1, "SM_test", scheduled ? "SCHEDULED" : "SENT"]);
  });
  it.each(["delivered", "failed", "sent"])("types all status references in %s callbacks", async status => {
    await updateSmsDelivery("SM_test", status);
    const [sql] = db.query.mock.calls[0];
    expect(sql.match(/\$2/g)).toHaveLength(3);
    expect(sql.match(/\$2::varchar\(20\)/g)).toHaveLength(3);
  });
});
