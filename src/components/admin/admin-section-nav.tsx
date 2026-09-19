import Link from "next/link";

export function AdminSectionNav({ active }: { active: "configurations" | "users" | "audit-log" | "data-quality" }) {
  return (
    <nav className="tab-row">
      <Link href="/admin/data-quality" className={active === "data-quality" ? "tab-link active" : "tab-link"}>
        Data Quality
      </Link>
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
