import { redirect } from "next/navigation";
import { PasskeyForm } from "@/components/auth/passkey-form";
import { getPasswordSession } from "@/server/auth/session-store";

export default async function PasskeyLoginPage() {
  if (!await getPasswordSession()) redirect("/login");
  return <main className="shell"><PasskeyForm /><p><a href="/login">Start sign-in again</a></p></main>;
}
