import { redirect } from "next/navigation";
import { PasskeyForm,RevokePasskey } from "@/components/auth/passkey-form";
import { getCurrentSession } from "@/server/auth/session-store";
import { query } from "@/server/db";

export default async function AccountSecurityPage({searchParams}:{searchParams:Promise<{setup?:string}>}) {
  const session=await getCurrentSession();
  if (!session) redirect("/login");
  const keys=await query<{id:string;label:string;active:boolean}>("select id,label,active from public.user_passkeys where user_id=$1 and revoked_at is null order by created_at",[session.userId]);
  const setup=(await searchParams).setup;
  const initialKey=keys.rows.find(key=>key.id===setup&&!key.active)?.id;
  return <div className="grid"><section className="card"><h2>Account security</h2>
    <p>{keys.rows.some(key=>key.active) ? "Passkey verification is enabled for your account." : "Passkey verification is not enabled yet."}</p>
    <ul>{keys.rows.map(key=><li key={key.id}>{key.label}: {key.active ? "Verified and active" : "Setup incomplete; not used for sign-in"}
      {!key.active&&<a href={`/account/security?setup=${encodeURIComponent(key.id)}`}> Finish setup</a>}
      <RevokePasskey credentialId={key.id} disabled={key.active&&keys.rows.filter(key=>key.active).length<2} />
    </li>)}</ul>
    <p>No private keys, fingerprints, face images, or device PINs are stored in the CRM.</p>
  </section><PasskeyForm key={initialKey??"new"} enrollment initialKey={initialKey} /></div>;
}
