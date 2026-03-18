import { requireCapability } from "@/server/auth/permissions";
import { query } from "@/server/db";

export default async function UsersPage() {
  await requireCapability("users:manage");
  const result = await query<{ id: string; email: string; role: string; status: string }>(
    `select id::text, email, role, status
     from public.users
     order by email asc`
  );

  return (
    <section className="table-shell">
      <p className="eyebrow">Users</p>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map((user: { id: string; email: string; role: string; status: string }) => (
            <tr key={user.id}>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>{user.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
