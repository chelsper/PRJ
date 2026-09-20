import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/data/donors", () => ({
  listDonorConnections: vi.fn(),
  listDonorGiving: vi.fn(),
  listDonorSoftCredits: vi.fn(),
  listDonorOrganizationRelationships: vi.fn(),
  listDonorNotes: vi.fn(),
  listOrganizationContacts: vi.fn(),
  listOrganizationRelationshipMembers: vi.fn()
}));
vi.mock("@/server/data/configurations", () => ({
  managedOptionSets: ["titles", "note_categories"],
  listConfigOptionsBySet: vi.fn()
}));
vi.mock("@/server/data/sms", () => ({
  getSmsPreference: vi.fn(),
  listDonorSmsMessages: vi.fn()
}));

import * as donors from "@/server/data/donors";
import { listConfigOptionsBySet } from "@/server/data/configurations";
import * as sms from "@/server/data/sms";
import { loadDonorTab, resolveDonorTab } from "@/server/data/donor-tab";

const loaders = { ...donors, ...sms, listConfigOptionsBySet };

beforeEach(() => {
  vi.resetAllMocks();
  for (const loader of Object.values(loaders)) vi.mocked(loader).mockResolvedValue([] as never);
});

describe("donor tab loading", () => {
  it.each([
    ["profile", ["listDonorConnections", "listDonorOrganizationRelationships", "listConfigOptionsBySet"]],
    ["giving", ["listDonorGiving", "listDonorSoftCredits"]],
    ["notes", ["listDonorNotes", "listConfigOptionsBySet"]],
    ["organization", ["listOrganizationContacts", "listOrganizationRelationshipMembers", "listConfigOptionsBySet"]],
    ["communications", ["getSmsPreference", "listDonorSmsMessages"]]
  ] as const)("loads only %s details", async (tab, expected) => {
    await loadDonorTab("donor-123", tab);
    for (const [name, loader] of Object.entries(loaders)) {
      const needed = (expected as readonly string[]).includes(name);
      expect(loader).toHaveBeenCalledTimes(needed ? 1 : 0);
      if (needed && name !== "listConfigOptionsBySet") expect(loader).toHaveBeenCalledWith("donor-123");
    }
  });

  it("defaults unknown tabs and individual organization links to profile", () => {
    expect(resolveDonorTab(undefined, "INDIVIDUAL")).toBe("profile");
    expect(resolveDonorTab("invalid", "ORGANIZATION")).toBe("profile");
    expect(resolveDonorTab("organization", "INDIVIDUAL")).toBe("profile");
    expect(resolveDonorTab("organization", "ORGANIZATION")).toBe("organization");
  });

  it("returns loaded details without replacing them", async () => {
    const notes = [{ id: "note-1" }];
    vi.mocked(donors.listDonorNotes).mockResolvedValue(notes as never);
    const data = await loadDonorTab("donor-123", "notes");
    expect(data.notes).toBe(notes);
    expect(data.giving).toEqual([]);
    expect(data.smsPreference).toBeNull();
  });

  it("propagates active-tab failures rather than showing false empty results", async () => {
    vi.mocked(donors.listDonorGiving).mockRejectedValue(new Error("Unavailable"));
    await expect(loadDonorTab("donor-123", "giving")).rejects.toThrow("Unavailable");
    await expect(loadDonorTab("donor-123", "communications")).resolves.toBeDefined();
  });
});
