import Link from "next/link";

import { logoutAction } from "@/app/login/actions";
import { getCurrentSession } from "@/server/auth/session-store";
import { roleHasCapability } from "@/server/auth/roles";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <strong>Nonprofit CRM</strong>
          <div className="muted">
            {session?.email} · {session?.role}
          </div>
        </div>
        <nav className="navlinks">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/donors">Donors</Link>
          <Link href="/gifts">Gifts</Link>
          <Link href="/reports">Reports</Link>
          <Link href="/imports">Imports</Link>
          {session && roleHasCapability(session.role, "users:manage") ? <Link href="/users">Users</Link> : null}
          {session && roleHasCapability(session.role, "audit:read") ? <Link href="/audit-log">Audit Log</Link> : null}
        </nav>
        <form action={logoutAction}>
          <button type="submit" className="secondary">
            Sign out
          </button>
        </form>
      </header>
      {children}
    </main>
  );
}
