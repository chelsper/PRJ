import { getCurrentSession } from "@/src/server/auth/session-store";
import { redirect } from "next/navigation";

import { loginAction } from "./actions";

export default async function LoginPage() {
  const session = await getCurrentSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Admin Access</p>
        <h1>Sign in to the nonprofit CRM</h1>
        <p className="muted">
          This application is admin-focused and server-rendered. Sensitive donor and gift data are only read and
          written on the server.
        </p>
      </section>

      <section className="card" style={{ maxWidth: 520 }}>
        <form action={loginAction} className="form-grid">
          <label className="full">
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="full">
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <div className="full">
            <button type="submit">Sign in</button>
          </div>
        </form>
      </section>
    </main>
  );
}
