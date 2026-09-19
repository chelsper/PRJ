import { afterEach, describe, expect, it, vi } from "vitest";
import { submitSmsRequest } from "@/components/communications/sms-request";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("SMS request confirmation", () => {
  it("accepts only explicit successful confirmation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ok: true })));
    expect(await submitSmsRequest("/test", {})).toEqual({ ok: true });
  });
  it("rejects HTML server failures instead of leaving a pending request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Error</html>", { status: 500 })));
    await expect(submitSmsRequest("/test", {})).rejects.toThrow("unexpected response");
  });
  it("handles network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(submitSmsRequest("/test", {})).rejects.toThrow("Connection interrupted");
  });
  it("explains permission or expired-session failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Forbidden", { status: 403 })));
    await expect(submitSmsRequest("/test", {})).rejects.toThrow("Sign in again");
  });
  it("does not report success for invalid payloads", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({})));
    await expect(submitSmsRequest("/test", {})).rejects.toThrow("did not confirm success");
  });
  it("shows validation errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "Use E.164 format" }, { status: 400 })));
    await expect(submitSmsRequest("/test", {})).rejects.toThrow("Use E.164 format");
  });
  it("times out without asserting that the server failed to save", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })));
    const pending = expect(submitSmsRequest("/test", {}, 100)).rejects.toThrow("may still complete");
    await vi.advanceTimersByTimeAsync(100);
    await pending;
    expect(vi.getTimerCount()).toBe(0);
  });
});
