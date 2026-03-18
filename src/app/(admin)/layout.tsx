import Link from "next/link";

import { logoutAction } from "@/app/login/actions";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";
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
          {session && (roleHasCapability(session.role, "users:manage") || roleHasCapability(session.role, "audit:read")) ? (
            <Link href="/admin">Admin</Link>
          ) : null}
        </nav>
        <div className="topbar-actions">
          <ViewModeToggle />
          <form action={logoutAction}>
            <button type="submit" className="secondary">
              Sign out
            </button>
          </form>
        </div>
      </header>
      {children}
    </main>
  );
}
