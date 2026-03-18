import { redirect } from "next/navigation";

export default function AuditLogRedirectPage() {
  redirect("/admin/audit-log");
}
