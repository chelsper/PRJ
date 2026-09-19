import { expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ headers: new Headers() }));
vi.mock("next/headers", () => ({ headers: async () => state.headers }));
vi.mock("@/server/env", () => ({ env: { APP_URL: "https://crm.example.org" } }));
import { assertSameOrigin } from "@/server/security/csrf";
it("requires an origin and rejects foreign origins", async () => {
  for (const origin of [null, "null", "https://attacker.example"]) {
    state.headers = new Headers({ host: "crm.example.org" });
    if (origin) state.headers.set("origin", origin);
    await expect(assertSameOrigin()).rejects.toThrow();
  }
});
it("accepts same-origin browser submissions", async () => {
  state.headers = new Headers({ host: "crm.example.org", origin: "https://crm.example.org" });
  await expect(assertSameOrigin()).resolves.toBeUndefined();
});
it("does not trust a spoofed forwarded host", async () => {
  state.headers = new Headers({ host: "crm.example.org", "x-forwarded-host": "evil.example", origin: "https://evil.example" });
  await expect(assertSameOrigin()).rejects.toThrow();
});
