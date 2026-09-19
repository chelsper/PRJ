"use client";

import { useState } from "react";

import type { SmsMessage, SmsPreference, SmsConsentStatus } from "@/server/data/sms";

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
  const [phone, setPhone] = useState(preference?.phone ?? defaultPhone ?? "");
  const [consentStatus, setConsentStatus] = useState<SmsConsentStatus>(preference?.consent_status ?? "UNKNOWN");
  const [consentSource, setConsentSource] = useState(preference?.consent_source ?? "");
  const [consentNote, setConsentNote] = useState(preference?.consent_note ?? "");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [scheduleLocal, setScheduleLocal] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  async function savePreference() {
    setSaving(true);
    setNotice(null);
    setError(null);
    const response = await fetch(`/api/donors/${donorId}/sms/preference`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ phone, consentStatus, consentSource, consentNote })
    });
    const payload = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) return setError(payload.error ?? "Consent details could not be saved.");
    setNotice("Texting preference saved.");
    window.location.reload();
  }

  async function sendMessage() {
    setSending(true);
    setNotice(null);
    setError(null);
    const scheduledFor = scheduleLocal ? new Date(scheduleLocal).toISOString() : null;
    const response = await fetch(`/api/donors/${donorId}/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ body, category, scheduledFor })
    });
    const payload = (await response.json()) as { error?: string; scheduled?: boolean };
    setSending(false);
    if (!response.ok) return setError(payload.error ?? "The text message could not be sent.");
    setBody("");
    setScheduleLocal("");
    setNotice(payload.scheduled ? "Text scheduled with Twilio." : "Text sent to Twilio.");
    window.location.reload();
  }

  return (
    <div className="grid sms-workspace">
      <section className="card sms-consent-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Texting Permission</p>
            <h2>{statusLabels[consentStatus]}</h2>
            <p className="muted">Document permission before sending any text to {donorName}.</p>
          </div>
          <span className={`status-badge sms-status-${consentStatus.toLowerCase()}`}>{statusLabels[consentStatus]}</span>
        </div>
        <div className="form-grid grid-2">
          <label>
            Mobile number
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+19045550100"
              disabled={!canWrite}
            />
            <span className="muted">Use international E.164 format.</span>
          </label>
          <label>
            Consent status
            <select
              value={consentStatus}
              onChange={(event) => setConsentStatus(event.target.value as SmsConsentStatus)}
              disabled={!canWrite}
            >
              <option value="UNKNOWN">Not documented</option>
              <option value="OPTED_IN">Opted in</option>
              <option value="OPTED_OUT">Opted out</option>
            </select>
          </label>
          <label>
            Consent source
            <select value={consentSource} onChange={(event) => setConsentSource(event.target.value)} disabled={!canWrite}>
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
              disabled={!canWrite}
            />
          </label>
        </div>
        {canWrite ? (
          <div className="button-row">
            <button type="button" onClick={savePreference} disabled={saving}>
              {saving ? "Saving..." : "Save Texting Preference"}
            </button>
          </div>
        ) : null}
      </section>

      <section className="card sms-compose-card">
        <p className="eyebrow">Send or Schedule Text</p>
        {!twilioConfigured ? (
          <p className="danger">Twilio is not connected in Vercel yet. Add the required environment variables before sending.</p>
        ) : null}
        <div className="form-grid">
          <label>
            Message category
            <select value={category} onChange={(event) => setCategory(event.target.value)} disabled={!canWrite}>
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
              disabled={!canWrite}
            />
            <span className="muted">{body.length}/1000 characters. Include Pink Ribbon Jax and opt-out instructions.</span>
          </label>
          <label>
            Schedule for (optional)
            <input
              type="datetime-local"
              value={scheduleLocal}
              onChange={(event) => setScheduleLocal(event.target.value)}
              disabled={!canWrite}
            />
            <span className="muted">Uses your current time zone. Schedule 16 minutes to 35 days ahead.</span>
          </label>
        </div>
        {error ? <p className="danger">{error}</p> : null}
        {notice ? <p className="success">{notice}</p> : null}
        {canWrite ? (
          <button
            type="button"
            onClick={sendMessage}
            disabled={sending || !twilioConfigured || consentStatus !== "OPTED_IN" || !body.trim()}
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
          </div>
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
                  <td>{new Date(message.created_at).toLocaleString()}</td>
                  <td>{message.direction === "OUTBOUND" ? "Sent" : "Received"}</td>
                  <td>{message.category.replaceAll("_", " ")}</td>
                  <td className="sms-message-body">{message.body}</td>
                  <td>
                    {message.status}
                    {message.error_message ? <span className="danger sms-error-detail">{message.error_message}</span> : null}
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
