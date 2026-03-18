import Link from "next/link";

import { getCurrentSession } from "@/server/auth/session-store";

import { signUpAction } from "@/app/login/actions";

export default async function SignUpPage({
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
          <h1>Create an admin account for donor operations</h1>
          <p className="muted">
            The first person to sign up becomes the initial admin. Any later self-service signups are created as
            read-only users until roles are changed by an admin.
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
