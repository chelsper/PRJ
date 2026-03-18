import Link from "next/link";

import { logoutAction } from "@/src/app/login/actions";
import { getCurrentSession } from "@/src/server/auth/session-store";

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
          <Link href="/users">Users</Link>
          <Link href="/audit-log">Audit Log</Link>
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
