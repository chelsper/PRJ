export const roles = ["admin", "staff", "read_only"] as const;
export type Role = (typeof roles)[number];

export type Capability =
  | "users:manage"
  | "donors:write"
  | "donors:read"
  | "gifts:write"
  | "gifts:read"
  | "reports:read"
  | "exports:run"
  | "audit:read";

export const roleCapabilities: Record<Role, readonly Capability[]> = {
  admin: ["users:manage", "donors:write", "donors:read", "gifts:write", "gifts:read", "reports:read", "exports:run", "audit:read"],
  staff: ["donors:write", "donors:read", "gifts:write", "gifts:read", "reports:read"],
  read_only: ["donors:read", "gifts:read", "reports:read"]
};

export function roleHasCapability(role: Role, capability: Capability) {
  return roleCapabilities[role].includes(capability);
}
