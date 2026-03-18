import Link from "next/link";

import { getInvitationByToken } from "@/server/data/users";

import { acceptInvitationAction } from "./actions";

export default async function InvitePage({
  searchParams
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? "";
  const invitation = token ? await getInvitationByToken(token) : null;
  const isExpired =
    !invitation || invitation.used_at !== null || new Date(invitation.expires_at).getTime() < Date.now();
  const setupErrorMessage =
    params.error === "password_mismatch"
      ? "Passwords must match."
      : params.error === "password_too_short"
        ? "Passwords must be at least 12 characters."
        : params.error === "already_registered"
          ? "That email address is already registered."
          : params.error === "validation"
            ? "Please review the password fields and try again."
            : params.error === "setup_failed"
              ? "Account setup could not be completed. Please try again or ask an admin for a fresh link."
              : null;

  return (
    <main className="shell auth-shell">
      <div className="auth-grid">
        <section className="hero auth-hero">
          <p className="eyebrow">Pink Ribbon Jax</p>
          <h1>Finish setting up your account</h1>
          <p className="muted">Invitation links are single-use and expire automatically.</p>
        </section>

        <section className="card auth-card">
          <p className="eyebrow">Invitation</p>
          {params.error === "invalid" || isExpired ? (
            <>
              <h2>Invitation unavailable</h2>
              <p className="danger">This invitation is invalid, expired, or already used.</p>
              <p className="muted">
                Ask an admin to send you a fresh invite link, or <Link href="/login">return to login</Link>.
              </p>
            </>
          ) : (
            <>
              <h2>Set your password</h2>
              <p className="muted">
                {invitation.email} will be created as <strong>{invitation.role}</strong>.
              </p>
              {setupErrorMessage ? <p className="danger">{setupErrorMessage}</p> : null}
              <form action={acceptInvitationAction} className="form-grid">
                <input type="hidden" name="token" value={token} />
                <label className="full">
                  Email
                  <input value={invitation.email} disabled readOnly />
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
                  <button type="submit">Activate account</button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
