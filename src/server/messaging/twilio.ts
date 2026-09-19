import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/server/env";
import {
  getQueuedSmsMessage,
  markSmsFailed,
  markSmsSending,
  markSmsSent
} from "@/server/data/sms";

function twilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !authToken || !messagingServiceSid) {
    throw new Error("Twilio messaging is not configured.");
  }

  return { accountSid, authToken, messagingServiceSid };
}

export function isTwilioConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_MESSAGING_SERVICE_SID
  );
}

export async function sendQueuedSmsMessage(messageId: string) {
  const message = await getQueuedSmsMessage(messageId);
  if (!message) throw new Error("Text message was not found.");
  if (message.provider_message_sid) return;
  if (message.status === "SENDING") throw new Error("A previous submission is still unconfirmed. Check Twilio and message history before retrying.");

  if (message.consent_status !== "OPTED_IN") {
    await markSmsFailed(messageId, "CONSENT_REQUIRED", "The constituent is not opted in.");
    throw new Error("The constituent is not opted in.");
  }

  if (!(await markSmsSending(messageId))) {
    return;
  }

  let acceptedSid: string | null = null;
  let rejectionCode: string | null = null;
  let requestStarted = false;
  let rejectionConfirmed = false;
  try {
    const config = twilioConfig();
    const form = new URLSearchParams({
      To: message.to_phone,
      MessagingServiceSid: config.messagingServiceSid,
      Body: message.body,
      StatusCallback: new URL("/api/webhooks/twilio/status", env.APP_URL).toString()
    });
    if (message.scheduled_for) {
      form.set("ScheduleType", "fixed");
      form.set("SendAt", new Date(message.scheduled_for).toISOString());
    }
    requestStarted = true;
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: form.toString(),
        cache: "no-store"
      }
    );
    const payload = (await response.json()) as { sid?: string; code?: number; message?: string };

    if (!response.ok || !payload.sid) {
      rejectionConfirmed = !response.ok;
      const errorMessage = payload.message ?? "Twilio rejected the message.";
      rejectionCode = payload.code?.toString() ?? null;
      throw new Error(errorMessage);
    }

    acceptedSid = payload.sid;
    await markSmsSent(messageId, payload.sid, Boolean(message.scheduled_for));
  } catch (error) {
    if (acceptedSid) {
      console.error("sms.accepted_status_save_failed", { messageId, providerSid: acceptedSid });
      throw new Error(`Twilio accepted this message, but the CRM could not save its status. Do not resend. Check Twilio message ${acceptedSid}.`);
    }
    if (requestStarted && !rejectionConfirmed) {
      throw new Error("Text submission could not be confirmed. Do not resend until you check Twilio and message history; the provider may have accepted it.");
    }
    const messageText = error instanceof Error ? error.message : "Text delivery failed.";
    await markSmsFailed(messageId, rejectionCode, messageText);
    throw error;
  }
}

export function validateTwilioSignature(input: {
  signature: string | null;
  url: string;
  parameters: Record<string, string>;
}) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken || !input.signature) return false;

  const data = Object.keys(input.parameters)
    .sort()
    .reduce((value, key) => `${value}${key}${input.parameters[key]}`, input.url);
  const expected = createHmac("sha1", authToken).update(data, "utf8").digest("base64");
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(input.signature);

  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export function formDataToTwilioParameters(formData: FormData) {
  const parameters: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") parameters[key] = value;
  }
  return parameters;
}
