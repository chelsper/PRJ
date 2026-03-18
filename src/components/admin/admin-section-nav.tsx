import Link from "next/link";

export function AdminSectionNav({ active }: { active: "configurations" | "users" | "audit-log" }) {
  return (
    <nav className="tab-row">
      <Link href="/admin/configurations" className={active === "configurations" ? "tab-link active" : "tab-link"}>
        Configurations
      </Link>
      <Link href="/admin/users" className={active === "users" ? "tab-link active" : "tab-link"}>
        Users
      </Link>
      <Link href="/admin/audit-log" className={active === "audit-log" ? "tab-link active" : "tab-link"}>
        Audit Log
      </Link>
    </nav>
  );
}
