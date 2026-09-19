import { NextResponse } from "next/server";

import { recordInboundSms } from "@/server/data/sms";
import { env } from "@/server/env";
import { formDataToTwilioParameters, validateTwilioSignature } from "@/server/messaging/twilio";

export async function POST(request: Request) {
  const formData = await request.formData();
  const parameters = formDataToTwilioParameters(formData);
  const url = new URL("/api/webhooks/twilio/inbound", env.APP_URL).toString();

  if (!validateTwilioSignature({ signature: request.headers.get("x-twilio-signature"), url, parameters })) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  if (parameters.From && parameters.To && parameters.MessageSid) {
    await recordInboundSms({
      fromPhone: parameters.From,
      toPhone: parameters.To,
      body: parameters.Body ?? "",
      providerSid: parameters.MessageSid,
      optOutType: parameters.OptOutType ?? null
    });
  }

  return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>", {
    headers: { "Content-Type": "text/xml" }
  });
}
