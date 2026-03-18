import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/server/auth/session-store";
import { countUsers } from "@/server/data/users";

import { signUpAction } from "@/app/login/actions";

export default async function SignUpPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getCurrentSession();
  const params = await searchParams;
  const existingUsers = await countUsers();

  if (existingUsers > 0) {
    redirect("/login?error=invite_required");
  }

  return (
    <main className="shell auth-shell">
      <div className="auth-grid">
        <section className="hero auth-hero">
          <p className="eyebrow">Pink Ribbon Jax</p>
          <h1>Create the initial admin account</h1>
          <p className="muted">
            This bootstrap page is only available before any users exist. After setup, all new users must be invited by
            an admin.
          </p>
        </section>

        <section className="card auth-card">
          <p className="eyebrow">Account Setup</p>
          <h2>Sign up</h2>
          {session ? <p className="muted">An active session is already present. Creating another account will replace it.</p> : null}
          {params.error === "exists" ? <p className="danger">That email is already registered.</p> : null}
          <form action={signUpAction} className="form-grid">
            <label className="full">
              Email
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label className="full">
              Password
              <input name="password" type="password" autoComplete="new-password" minLength={12} required />
            </label>
            <label className="full">
              Confirm password
              <input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required />
            </label>
            <div className="full">
              <button type="submit">Create account</button>
            </div>
          </form>
          <p className="muted">
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
