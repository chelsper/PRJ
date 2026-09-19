import { NextResponse } from "next/server";

import { updateSmsDelivery } from "@/server/data/sms";
import { env } from "@/server/env";
import { formDataToTwilioParameters, validateTwilioSignature } from "@/server/messaging/twilio";

export async function POST(request: Request) {
  const formData = await request.formData();
  const parameters = formDataToTwilioParameters(formData);
  const url = new URL("/api/webhooks/twilio/status", env.APP_URL).toString();

  if (!validateTwilioSignature({ signature: request.headers.get("x-twilio-signature"), url, parameters })) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  if (parameters.MessageSid && parameters.MessageStatus) {
    await updateSmsDelivery(parameters.MessageSid, parameters.MessageStatus, parameters.ErrorCode ?? null);
  }

  return new NextResponse(null, { status: 204 });
}
