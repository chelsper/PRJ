import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import { CopyInviteLinkButton } from "@/components/admin/copy-invite-link-button";
import { requireCapability } from "@/server/auth/permissions";
import { roles, type Role } from "@/server/auth/roles";
import { listInvitations, listUsers, type UserInvitationRow, type UserRow } from "@/server/data/users";
import { env } from "@/server/env";

import { createDirectUserAction, createInvitationAction, regenerateInvitationAction, updateUserAction } from "../../users/actions";

export default async function AdminUsersPage({
  searchParams
}: {
  searchParams: Promise<{
    invite_token?: string;
    invite_email?: string;
    invite_role?: string;
    created_email?: string;
    created_role?: string;
    error?: string;
  }>;
}) {
  await requireCapability("users:manage");
  const params = await searchParams;
  const [users, invitations] = await Promise.all([listUsers(), listInvitations()]);
  const inviteLink = params.invite_token ? `${env.APP_URL}/invite?token=${params.invite_token}` : null;

  return (
    <div className="grid">
      <section className="hero">
        <p className="eyebrow">Admin</p>
        <h1>Users</h1>
        <p className="muted">Manage invitations, roles, and account status from one place.</p>
      </section>

      <AdminSectionNav active="users" />

      <section className="card">
        <p className="eyebrow">Invite User</p>
        <form action={createInvitationAction} className="form-grid">
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Role
            <select name="role" defaultValue="staff">
              {roles.map((role: Role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <div className="full">
            <button type="submit">Generate invitation</button>
          </div>
        </form>
        {params.error === "invite_failed" ? <p className="danger">The invitation could not be created.</p> : null}
        {inviteLink ? (
          <div className="form-grid" style={{ marginTop: 16 }}>
            <label className="full">
              Invitation link for {params.invite_email} ({params.invite_role})
              <input value={inviteLink} readOnly />
            </label>
            <div className="button-row">
              <CopyInviteLinkButton link={inviteLink} />
            </div>
            <p className="muted">This is a single-use link that expires automatically.</p>
          </div>
        ) : null}
      </section>

      <section className="card">
        <p className="eyebrow">Create User Directly</p>
        <p className="muted">Use this fallback when you want to skip the invite link and give the user a password directly.</p>
        <form action={createDirectUserAction} className="form-grid">
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Role
            <select name="role" defaultValue="staff">
              {roles.map((role: Role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <label>
            Temporary password
            <input name="password" type="text" minLength={12} required />
          </label>
          <label>
            Confirm password
            <input name="confirmPassword" type="text" minLength={12} required />
          </label>
          <div className="full">
            <button type="submit">Create user</button>
          </div>
        </form>
        {params.error === "direct_user_exists" ? <p className="danger">A user with that email already exists.</p> : null}
        {params.error === "direct_user_failed" ? <p className="danger">The user could not be created.</p> : null}
        {params.created_email ? (
          <p className="muted">
            User created for <strong>{params.created_email}</strong> as <strong>{params.created_role}</strong>. They can now sign in with the password you entered.
          </p>
        ) : null}
      </section>

      <section className="table-shell">
        <p className="eyebrow">Users</p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last login</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: UserRow) => {
                const formId = `user-form-${user.id}`;

                return (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>
                      <select name="role" form={formId} defaultValue={user.role}>
                        {roles.map((role: Role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select name="status" form={formId} defaultValue={user.status}>
                        <option value="active">active</option>
                        <option value="disabled">disabled</option>
                      </select>
                    </td>
                    <td>{user.last_login_at ? user.last_login_at.slice(0, 19).replace("T", " ") : "Never"}</td>
                    <td>
                      <form id={formId} action={updateUserAction}>
                        <input type="hidden" name="userId" value={user.id} />
                        <button type="submit" className="secondary">
                          Save
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {params.error === "user_update_failed" ? <p className="danger">The user update could not be saved.</p> : null}
      </section>

      <section className="table-shell">
        <p className="eyebrow">Recent Invitations</p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Invited by</th>
                <th>Expires</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((invitation: UserInvitationRow) => {
                const expired = invitation.used_at === null && new Date(invitation.expires_at).getTime() < Date.now();
                const status = invitation.used_at ? "accepted" : expired ? "expired" : "pending";

                return (
                  <tr key={invitation.id}>
                    <td>{invitation.email}</td>
                    <td>{invitation.role}</td>
                    <td>{invitation.invited_by_email ?? "System"}</td>
                    <td>{invitation.expires_at.slice(0, 19).replace("T", " ")}</td>
                    <td>{status}</td>
                    <td>
                      {invitation.used_at ? null : (
                        <form action={regenerateInvitationAction}>
                          <input type="hidden" name="invitationId" value={invitation.id} />
                          <button type="submit" className="secondary">
                            Regenerate link
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
