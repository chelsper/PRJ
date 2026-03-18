import { getCurrentSession } from "@/server/auth/session-store";

import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getCurrentSession();
  const params = await searchParams;

  return (
    <main className="shell auth-shell">
      <div className="auth-grid">
        <section className="hero auth-hero">
          <p className="eyebrow">Pink Ribbon Jax</p>
          <h1>Sign in to manage donor and gift records</h1>
          <p className="muted">
            This application is admin-focused and server-rendered. Sensitive donor and gift data are only read and
            written on the server.
          </p>
        </section>

        <section className="card auth-card">
          <p className="eyebrow">Admin Access</p>
          <h2>Log in</h2>
          {session ? <p className="muted">An active session is already present. Signing in again will refresh it.</p> : null}
          {params.error === "invalid" ? <p className="danger">Invalid email or password.</p> : null}
          {params.error === "invite_required" ? <p className="danger">An admin invitation is required to create a new account.</p> : null}
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
          <p className="muted">Need access? Ask an admin for an invitation link.</p>
        </section>
      </div>
    </main>
  );
}
