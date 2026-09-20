"use client";
import { useState } from "react";
import { startRegistration,startAuthentication } from "@simplewebauthn/browser";
import type { PublicKeyCredentialCreationOptionsJSON,PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";

async function send<T>(body:unknown):Promise<T> {
  const response=await fetch("/api/auth/passkeys",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const data=await response.json();
  if (!response.ok) throw new Error(data.error ?? "Passkey request failed.");
  return data;
}

export function PasskeyForm({enrollment=false,initialKey}:{enrollment?:boolean;initialKey?:string}) {
  const [password,setPassword]=useState("");
  const [label,setLabel]=useState("My passkey");
  const [pendingKey,setPendingKey]=useState<string|undefined>(initialKey);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [saved,setSaved]=useState(false);
  const [recovery,setRecovery]=useState("");
  const [codes,setCodes]=useState<string[]>([]);
  async function run(action:()=>Promise<void>) {
    setBusy(true);setError("");
    try {await action();} catch(e) {setError(e instanceof Error ? e.message : "The passkey prompt was cancelled or failed. Please try again.");}
    finally {setBusy(false);}
  }
  async function authenticate(credentialId?:string) {
    const request=await send<{options:PublicKeyCredentialRequestOptionsJSON;challengeId:string}>({action:"authenticate",credentialId});
    const response=await startAuthentication({optionsJSON:request.options});
    const result=await send<{recoveryCodes:string[]}>({action:"verify",challengeId:request.challengeId,response});
    if (enrollment) {setCodes(result.recoveryCodes);setSaved(true);setPendingKey(undefined);}
    else window.location.assign("/dashboard");
  }
  return <section className="card" style={{maxWidth:"48rem",marginInline:"auto"}}>
    <h1>{enrollment ? "Set up a passkey" : "Verify your passkey"}</h1>
    <p>{enrollment ? "Use your device's fingerprint, face recognition, PIN, or a security key. Your password remains required at sign-in. Setup does not become active until you test the new passkey." : "Your password was accepted. Complete the device prompt to access the CRM."}</p>
    {error && <p className="danger" role="alert">{error}</p>}
    {saved ? <div role="status"><h2>Passkey verified and active</h2><p>Future sign-ins require your password and a passkey. Add a second passkey on a separate device for backup.</p>
      {!!codes.length && <><h3>Store these recovery codes securely</h3><p>Each code works once, with your password. These codes are shown only now. Print them or store them in your password manager, separately from your sign-in device.</p><pre style={{overflowX:"auto"}}>{codes.join("\n")}</pre></>}
      <a href="/account/security">Return to account security</a></div> : <>
      {enrollment && !pendingKey && <form onSubmit={event=>{event.preventDefault();void run(async()=>{
        const request=await send<{options:PublicKeyCredentialCreationOptionsJSON;challengeId:string}>({action:"register",password,label});
        setPassword("");
        const response=await startRegistration({optionsJSON:request.options});
        const result=await send<{credentialId:string}>({action:"verify",challengeId:request.challengeId,response});
        setPendingKey(result.credentialId);
      });}}>
        <div className="form-grid"><label>Passkey name<input value={label} maxLength={80} required onChange={e=>setLabel(e.target.value)} /></label>
        <label>Confirm your current password<input type="password" autoComplete="current-password" value={password} maxLength={128} required onChange={e=>setPassword(e.target.value)} /></label></div>
        <button type="submit" disabled={busy}>{busy ? "Opening device prompt..." : "Create passkey"}</button>
      </form>}
      {pendingKey && <p role="status">Passkey created but not active yet. Test it now to finish setup.</p>}
      {(!enrollment || pendingKey) && <button type="button" disabled={busy} onClick={()=>void run(()=>authenticate(pendingKey))}>{busy ? "Verifying..." : enrollment ? "Test and activate passkey" : "Verify passkey"}</button>}
      {!enrollment && <details style={{marginTop:"1rem"}}><summary>Lost access to your passkey?</summary><p>Use a recovery code saved during setup. It will be consumed only if accepted.</p><form onSubmit={e=>{e.preventDefault();void run(async()=>{await send({action:"recover",code:recovery});window.location.assign("/account/security");});}}><label>Recovery code<input autoComplete="off" value={recovery} maxLength={80} onChange={e=>setRecovery(e.target.value)} required /></label><button disabled={busy}>Use recovery code</button></form></details>}
    </>}
  </section>;
}

export function RevokePasskey({credentialId,disabled}:{credentialId:string;disabled:boolean}) {
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  return <details><summary>Remove this passkey</summary><p>Removing a key signs out all your sessions. You must keep at least one verified passkey.</p>
    {error && <p role="alert">{error}</p>}<form onSubmit={e=>{e.preventDefault();setBusy(true);setError("");void send({action:"revoke",credentialId,password}).then(()=>window.location.assign("/login")).catch(error=>setError(error.message)).finally(()=>setBusy(false));}}>
      <label>Current password<input type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} /></label>
      <button disabled={disabled||busy}>{busy?"Removing...":"Remove passkey and sign out"}</button>{disabled&&<p>Add and verify a replacement first.</p>}
    </form></details>;
}
