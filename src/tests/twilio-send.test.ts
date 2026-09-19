import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const sms = vi.hoisted(() => ({ getQueuedSmsMessage: vi.fn(), markSmsFailed: vi.fn(), markSmsSending: vi.fn(), markSmsSent: vi.fn() }));
vi.mock("@/server/data/sms", () => sms);
vi.mock("@/server/env", () => ({ env: { APP_URL: "https://crm.example.org" } }));
import { sendQueuedSmsMessage } from "@/server/messaging/twilio";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("TWILIO_ACCOUNT_SID", "AC_test"); vi.stubEnv("TWILIO_AUTH_TOKEN", "test"); vi.stubEnv("TWILIO_MESSAGING_SERVICE_SID", "MG_test");
  sms.getQueuedSmsMessage.mockResolvedValue({ id: "1", to_phone: "+15555550100", body: "Test", scheduled_for: "2026-09-20T12:00:00Z", consent_status: "OPTED_IN" });
  sms.markSmsSending.mockResolvedValue(true);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ sid: "SM_test" })));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe("Twilio acceptance versus local persistence", () => {
  it("records an accepted scheduled message", async () => {
    await sendQueuedSmsMessage("1");
    expect(sms.markSmsSent).toHaveBeenCalledWith("1", "SM_test", true);
    expect(sms.markSmsFailed).not.toHaveBeenCalled();
  });
  it("does not mark accepted messages failed or retry when persistence fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    sms.markSmsSent.mockRejectedValue(new Error("Database unavailable"));
    await expect(sendQueuedSmsMessage("1")).rejects.toThrow("Do not resend");
    expect(sms.markSmsFailed).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("does not send without consent", async () => {
    sms.getQueuedSmsMessage.mockResolvedValue({ consent_status: "OPTED_OUT" });
    await expect(sendQueuedSmsMessage("1")).rejects.toThrow("not opted in");
    expect(fetch).not.toHaveBeenCalled();
  });
});
