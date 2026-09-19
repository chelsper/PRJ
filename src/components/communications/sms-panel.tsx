"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { SmsMessage, SmsPreference, SmsConsentStatus } from "@/server/data/sms";
import { submitSmsRequest } from "./sms-request";

const statusLabels: Record<SmsConsentStatus, string> = {
  UNKNOWN: "Not documented",
  OPTED_IN: "Opted in",
  OPTED_OUT: "Opted out"
};

export function SmsPanel({
  donorId,
  donorName,
  defaultPhone,
  preference,
  messages,
  canWrite,
  twilioConfigured
}: {
  donorId: string;
  donorName: string;
  defaultPhone: string | null;
  preference: SmsPreference | null;
  messages: SmsMessage[];
  canWrite: boolean;
  twilioConfigured: boolean;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState(preference?.phone ?? defaultPhone ?? "");
  const [consentStatus, setConsentStatus] = useState<SmsConsentStatus>(preference?.consent_status ?? "UNKNOWN");
  const [savedConsentStatus, setSavedConsentStatus] = useState<SmsConsentStatus>(preference?.consent_status ?? "UNKNOWN");
  const [consentSource, setConsentSource] = useState(preference?.consent_source ?? "");
  const [consentNote, setConsentNote] = useState(preference?.consent_note ?? "");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [scheduleLocal, setScheduleLocal] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [preferenceNotice, setPreferenceNotice] = useState<string | null>(null);
  const [preferenceError, setPreferenceError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedPreference, setSavedPreference] = useState({ phone: preference?.phone ?? defaultPhone ?? "", consentStatus: preference?.consent_status ?? "UNKNOWN", consentSource: preference?.consent_source ?? "", consentNote: preference?.consent_note ?? "" });
  const preferenceDirty = normalizePhone(phone) !== normalizePhone(savedPreference.phone) || consentStatus !== savedPreference.consentStatus || consentSource !== savedPreference.consentSource || consentNote !== savedPreference.consentNote;

  function normalizePhone(value: string) {
    const trimmed = value.trim();
    if (trimmed.startsWith("+")) return `+${trimmed.slice(1).replace(/\D/g, "")}`;

    const digits = trimmed.replace(/\D/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    return trimmed;
  }

  async function savePreference() {
    if (saving) return;
    setSaving(true);
    setSaved(false);
    setPreferenceNotice(null);
    setPreferenceError(null);
    const normalizedPhone = normalizePhone(phone);
    try {
      await submitSmsRequest(`/api/donors/${donorId}/sms/preference`, { phone: normalizedPhone, consentStatus, consentSource, consentNote });
      setPhone(normalizedPhone);
      setSavedConsentStatus(consentStatus);
      setSavedPreference({ phone: normalizedPhone, consentStatus, consentSource, consentNote });
      setSaved(true);
      setPreferenceNotice("Texting preference saved.");
      router.refresh();
    } catch (error) {
      setPreferenceError(error instanceof Error ? error.message : "Save could not be confirmed. Refresh and check before retrying.");
    } finally { setSaving(false); }
  }

  async function sendMessage() {
    if (sending || saving || preferenceDirty) return;
    const actionLabel = scheduleLocal ? "schedule" : "send";
    const timing = scheduleLocal ? ` for ${new Date(scheduleLocal).toLocaleString()}` : " now";
    if (!window.confirm(`Confirm you want to ${actionLabel} this text to ${phone}${timing}.`)) return;

    setSending(true);
    setNotice(null);
    setError(null);
    try {
      const scheduledFor = scheduleLocal ? new Date(scheduleLocal).toISOString() : null;
      const payload = await submitSmsRequest(`/api/donors/${donorId}/sms/send`, { body, category, scheduledFor });
      setBody("");
      setScheduleLocal("");
      setNotice(payload.scheduled ? "Text scheduled with Twilio." : "Text accepted by Twilio for delivery.");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Submission could not be confirmed. Check message history before retrying.");
    } finally { setSending(false); }
  }

  return (
    <div className="grid sms-workspace">
      <section className="card sms-consent-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Texting Permission</p>
            <h2>{statusLabels[savedConsentStatus]}</h2>
            <p className="muted">Document permission before sending any text to {donorName}.</p>
          </div>
          <span className={`status-badge sms-status-${savedConsentStatus.toLowerCase()}`}>{statusLabels[savedConsentStatus]}</span>
        </div>
        <div className="form-grid grid-2">
          <label>
            Mobile number
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+19045550100"
              disabled={!canWrite || saving || sending}
            />
            <span className="muted">US numbers are formatted automatically. For other countries, include + and the country code.</span>
          </label>
          <label>
            Consent status
            <select
              value={consentStatus}
              onChange={(event) => setConsentStatus(event.target.value as SmsConsentStatus)}
              disabled={!canWrite || saving || sending}
            >
              <option value="UNKNOWN">Not documented</option>
              <option value="OPTED_IN">Opted in</option>
              <option value="OPTED_OUT">Opted out</option>
            </select>
          </label>
          <label>
            Consent source
            <select value={consentSource} onChange={(event) => setConsentSource(event.target.value)} disabled={!canWrite || saving || sending}>
              <option value="">Select source</option>
              <option value="Written form">Written form</option>
              <option value="Online form">Online form</option>
              <option value="Verbal permission">Verbal permission</option>
              <option value="Twilio START reply">Twilio START reply</option>
              <option value="Imported documentation">Imported documentation</option>
            </select>
          </label>
          <label>
            Consent note
            <input
              value={consentNote}
              onChange={(event) => setConsentNote(event.target.value)}
              placeholder="Where and when permission was obtained"
              disabled={!canWrite || saving || sending}
            />
          </label>
        </div>
        {canWrite ? (
          <div className="button-row">
            <button type="button" onClick={savePreference} disabled={saving || sending}>
              {saving ? "Saving..." : saved && !preferenceDirty ? "Saved" : "Save Texting Preference"}
            </button>
          </div>
        ) : null}
        {preferenceDirty && !saving ? <p className="muted">Unsaved texting-permission changes. Save before sending a text.</p> : null}
        {preferenceError ? <p className="danger" role="alert">{preferenceError}</p> : null}
        {preferenceNotice && !preferenceDirty ? <p className="success" role="status">{preferenceNotice}</p> : null}
      </section>

      <section className="card sms-compose-card">
        <p className="eyebrow">Send or Schedule Text</p>
        <details>
          <summary>Before your first text: setup checklist</summary>
          <ul>
            <li>{twilioConfigured ? "Twilio credentials are configured. This does not verify sender readiness." : "Configure Twilio credentials in Vercel."}</li>
            <li>Add your SMS-capable number to the existing Messaging Service sender pool.</li>
            <li>Confirm the applicable sender registration or verification is approved in Twilio.</li>
            <li>Save documented consent, then test with your own opted-in number before contacting a group.</li>
            <li>Check for Delivered in history. Scheduled or accepted does not mean delivered.</li>
          </ul>
        </details>
        {!twilioConfigured ? (
          <p className="danger">Twilio is not connected in Vercel yet. Add the required environment variables before sending.</p>
        ) : null}
        {savedConsentStatus !== "OPTED_IN" ? (
          <div className="sms-action-notice" role="status">
            Save this constituent as <strong>Opted in</strong> under Texting Permission before sending or scheduling a message.
          </div>
        ) : null}
        <div className="form-grid">
          <label>
            Message category
            <select value={category} onChange={(event) => setCategory(event.target.value)} disabled={!canWrite || sending}>
              <option value="GENERAL">General</option>
              <option value="THANK_YOU">Thank you</option>
              <option value="PLEDGE_REMINDER">Pledge reminder</option>
              <option value="EVENT_REMINDER">Event reminder</option>
              <option value="CAMPAIGN">Campaign</option>
            </select>
          </label>
          <label>
            Message
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={1000}
              rows={5}
              placeholder="Pink Ribbon Jax: Type your message here. Reply STOP to opt out."
              disabled={!canWrite || sending}
            />
            <span className="muted">{body.length}/1000 characters. Include Pink Ribbon Jax and opt-out instructions.</span>
          </label>
          <label>
            Schedule for (optional)
            <input
              type="datetime-local"
              value={scheduleLocal}
              onChange={(event) => setScheduleLocal(event.target.value)}
              disabled={!canWrite || sending}
            />
            <span className="muted">Uses your current time zone. Schedule 16 minutes to 35 days ahead.</span>
          </label>
        </div>
        {error ? <p className="danger" role="alert">{error}</p> : null}
        {notice ? <p className="success" role="status">{notice}</p> : null}
        {canWrite ? (
          <button
            type="button"
            onClick={sendMessage}
            disabled={sending || saving || preferenceDirty || !!preferenceError || !twilioConfigured || savedConsentStatus !== "OPTED_IN" || !body.trim()}
            title={savedConsentStatus !== "OPTED_IN" ? "Document and save texting consent first." : undefined}
          >
            {sending ? "Submitting..." : scheduleLocal ? "Schedule Text" : "Send Text"}
          </button>
        ) : null}
      </section>

      <section className="table-shell full">
        <div className="section-header">
          <div>
            <p className="eyebrow">Text Message History</p>
            <p className="muted">Outbound messages, replies, delivery status, and failures.</p>
            <p className="muted">Accepted is not delivery confirmation. Check failed-message details before retrying.</p>
          </div>
          <button type="button" className="secondary" onClick={() => router.refresh()}>Refresh status</button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Direction</th>
                <th>Category</th>
                <th>Message</th>
                <th>Status</th>
                <th>Created by</th>
              </tr>
            </thead>
            <tbody>
              {messages.length === 0 ? (
                <tr><td colSpan={6} className="muted">No text messages recorded.</td></tr>
              ) : messages.map((message) => (
                <tr key={message.id}>
                  <td>
                    {new Date(message.created_at).toLocaleString()}
                    {message.scheduled_for ? <p className="muted">Scheduled for {new Date(message.scheduled_for).toLocaleString()}</p> : null}
                    {message.delivered_at ? <p className="muted">Delivered {new Date(message.delivered_at).toLocaleString()}</p> : null}
                  </td>
                  <td>{message.direction === "OUTBOUND" ? "Outgoing" : "Incoming"}</td>
                  <td>{message.category.replaceAll("_", " ")}</td>
                  <td className="sms-message-body">{message.body}</td>
                  <td>
                    <strong>{message.status === "SENT" ? "Accepted / sent (delivery unconfirmed)" : message.status.toLowerCase().replaceAll("_", " ")}</strong>
                    {message.error_message ? <span className="danger sms-error-detail">{message.error_message}</span> : null}
                    {message.error_code ? <p><a href={`https://www.twilio.com/docs/api/errors/${encodeURIComponent(message.error_code)}`} target="_blank" rel="noreferrer">Twilio error {message.error_code}</a></p> : null}
                    {message.provider_message_sid ? <details><summary>Tracking ID</summary><span style={{ overflowWrap: "anywhere" }}>{message.provider_message_sid}</span></details> : null}
                  </td>
                  <td>{message.created_by_email ?? "Twilio"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
