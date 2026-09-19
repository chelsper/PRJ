import { writeAuditLog } from "@/server/audit";
import { query, transaction } from "@/server/db";

export type SmsConsentStatus = "UNKNOWN" | "OPTED_IN" | "OPTED_OUT";

export type SmsPreference = {
  donor_id: string;
  phone: string;
  consent_status: SmsConsentStatus;
  consent_source: string | null;
  consent_note: string | null;
  consent_at: string | null;
  opted_out_at: string | null;
};

export type SmsMessage = {
  id: string;
  direction: "OUTBOUND" | "INBOUND";
  category: string;
  to_phone: string | null;
  from_phone: string | null;
  body: string;
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  error_message: string | null;
  error_code: string | null;
  provider_message_sid: string | null;
  created_at: string;
  created_by_email: string | null;
};

export async function getSmsPreference(donorId: string) {
  const result = await query<SmsPreference>(
    `select donor_id::text, phone, consent_status, consent_source, consent_note,
            consent_at::text, opted_out_at::text
     from public.donor_sms_preferences
     where donor_id = $1`,
    [Number(donorId)]
  );
  return result.rows[0] ?? null;
}

export async function listDonorSmsMessages(donorId: string) {
  const result = await query<SmsMessage>(
    `select m.id::text, m.direction, m.category, m.to_phone, m.from_phone, m.body,
            m.status, m.scheduled_for::text, m.sent_at::text, m.delivered_at::text,
            m.error_message, m.error_code, m.provider_message_sid, m.created_at::text, u.email as created_by_email
     from public.sms_messages m
     left join public.users u on u.id = m.created_by
     where m.donor_id = $1
     order by m.created_at desc
     limit 100`,
    [Number(donorId)]
  );
  return result.rows;
}

export async function saveSmsPreference(input: {
  donorId: string;
  phone: string;
  consentStatus: SmsConsentStatus;
  consentSource?: string | null;
  consentNote?: string | null;
  actorUserId: string;
  ipAddress?: string | null;
}) {
  const previous = await getSmsPreference(input.donorId);
  await query(
    `insert into public.donor_sms_preferences (
       donor_id, phone, consent_status, consent_source, consent_note,
       consent_at, opted_out_at, updated_by
     ) values (
       $1, $2, $3::varchar(20), $4, $5,
       case when $3::varchar(20) = 'OPTED_IN' then now() else null end,
       case when $3::varchar(20) = 'OPTED_OUT' then now() else null end,
       $6
     )
     on conflict (donor_id) do update set
       phone = excluded.phone,
       consent_status = excluded.consent_status,
       consent_source = excluded.consent_source,
       consent_note = excluded.consent_note,
       consent_at = case
         when excluded.consent_status = 'OPTED_IN' and donor_sms_preferences.consent_status <> 'OPTED_IN' then now()
         else donor_sms_preferences.consent_at
       end,
       opted_out_at = case
         when excluded.consent_status = 'OPTED_OUT' then now()
         when excluded.consent_status = 'OPTED_IN' then null
         else donor_sms_preferences.opted_out_at
       end,
       updated_by = excluded.updated_by`,
    [
      Number(input.donorId),
      input.phone,
      input.consentStatus,
      input.consentSource ?? null,
      input.consentNote ?? null,
      Number(input.actorUserId)
    ]
  );

  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: "sms.consent.updated",
    entityType: "donor",
    entityId: input.donorId,
    status: "success",
    ipAddress: input.ipAddress,
    metadata: {
      before: previous,
      after: {
        phone: input.phone,
        consentStatus: input.consentStatus,
        consentSource: input.consentSource ?? null
      }
    }
  });
}

export async function queueSmsMessage(input: {
  donorId: string;
  body: string;
  category: string;
  scheduledFor?: Date | null;
  actorUserId: string;
  ipAddress?: string | null;
}) {
  return transaction(async (client) => {
    const preferenceResult = await client.query<SmsPreference>(
      `select donor_id::text, phone, consent_status, consent_source, consent_note,
              consent_at::text, opted_out_at::text
       from public.donor_sms_preferences
       where donor_id = $1
       for update`,
      [Number(input.donorId)]
    );
    const preference = preferenceResult.rows[0];

    if (!preference || preference.consent_status !== "OPTED_IN") {
      throw new Error("This constituent has not opted in to text messages.");
    }

    const scheduled = Boolean(input.scheduledFor && input.scheduledFor.getTime() > Date.now() + 60_000);
    const existing = await client.query<{ id: string; scheduled: boolean }>(
      `select id::text, scheduled_for is not null as scheduled from public.sms_messages
       where donor_id = $1 and direction = 'OUTBOUND' and body = $2 and category = $3
         and to_phone = $4 and scheduled_for is not distinct from $5::timestamptz
         and status in ('QUEUED', 'SCHEDULED', 'SENDING', 'SENT', 'DELIVERED')
         and created_at >= now() - interval '15 minutes'
       order by created_at desc limit 1`,
      [Number(input.donorId), input.body, input.category, preference.phone, scheduled ? input.scheduledFor : null]
    );
    if (existing.rows[0]) return { messageId: existing.rows[0].id, scheduled: existing.rows[0].scheduled };
    const messageResult = await client.query<{ id: string }>(
      `insert into public.sms_messages (
         donor_id, direction, category, to_phone, body, status, scheduled_for, created_by
       ) values ($1, 'OUTBOUND', $2, $3, $4, $5, $6, $7)
       returning id::text`,
      [
        Number(input.donorId),
        input.category,
        preference.phone,
        input.body,
        scheduled ? "SCHEDULED" : "QUEUED",
        scheduled ? input.scheduledFor! : null,
        Number(input.actorUserId)
      ]
    );
    const messageId = messageResult.rows[0].id;

    await client.query(
      `insert into public.audit_log (
         actor_user_id, action, entity_type, entity_id, status, ip_address, metadata
       ) values ($1, 'sms.message.queued', 'sms_message', $2, 'success', $3, $4::jsonb)`,
      [
        Number(input.actorUserId),
        messageId,
        input.ipAddress ?? null,
        JSON.stringify({ donorId: input.donorId, category: input.category, scheduledFor: input.scheduledFor?.toISOString() ?? null })
      ]
    );

    return { messageId, scheduled };
  });
}

export async function getQueuedSmsMessage(messageId: string) {
  const result = await query<{
    id: string;
    donor_id: string;
    to_phone: string;
    body: string;
    status: string;
    scheduled_for: string | null;
    consent_status: SmsConsentStatus;
    provider_message_sid: string | null;
  }>(
    `select m.id::text, m.donor_id::text, m.to_phone, m.body, m.status,
            m.scheduled_for::text, p.consent_status, m.provider_message_sid
     from public.sms_messages m
     join public.donor_sms_preferences p on p.donor_id = m.donor_id
     where m.id = $1`,
    [Number(messageId)]
  );
  return result.rows[0] ?? null;
}

export async function listDueSmsMessageIds(limit = 50) {
  const result = await query<{ id: string }>(
    `select id::text
     from public.sms_messages
     where status = 'SCHEDULED' and scheduled_for <= now()
     order by scheduled_for
     limit $1`,
    [limit]
  );
  return result.rows.map((row) => row.id);
}

export async function markSmsSending(messageId: string) {
  const result = await query(
    `update public.sms_messages
     set status = 'SENDING'
     where id = $1 and status in ('QUEUED', 'SCHEDULED') and provider_message_sid is null`,
    [Number(messageId)]
  );
  return result.rowCount === 1;
}

export async function markSmsSent(messageId: string, providerSid: string, scheduled: boolean) {
  await query(
    `update public.sms_messages
     set status = $3::varchar(20), provider_message_sid = $2,
         sent_at = case when $3::varchar(20) = 'SENT' then now() else sent_at end,
         error_code = null, error_message = null
     where id = $1`,
    [Number(messageId), providerSid, scheduled ? "SCHEDULED" : "SENT"]
  );
}

export async function markSmsFailed(messageId: string, errorCode: string | null, errorMessage: string) {
  await query(
    `update public.sms_messages
     set status = 'FAILED', failed_at = now(), error_code = $2, error_message = $3
     where id = $1`,
    [Number(messageId), errorCode, errorMessage]
  );
}

export async function updateSmsDelivery(providerSid: string, providerStatus: string, errorCode?: string | null) {
  const delivered = providerStatus === "delivered";
  const failed = ["failed", "undelivered"].includes(providerStatus);
  const status = delivered ? "DELIVERED" : failed ? "FAILED" : "SENT";
  await query(
    `update public.sms_messages
     set status = $2::varchar(20),
         delivered_at = case when $2::varchar(20) = 'DELIVERED' then now() else delivered_at end,
         failed_at = case when $2::varchar(20) = 'FAILED' then now() else failed_at end,
         error_code = coalesce($3, error_code)
     where provider_message_sid = $1`,
    [providerSid, status, errorCode ?? null]
  );
}

export async function recordInboundSms(input: {
  fromPhone: string;
  toPhone: string;
  body: string;
  providerSid: string;
  optOutType?: string | null;
}) {
  const preferenceResult = await query<{ donor_id: string }>(
    `select donor_id::text
     from public.donor_sms_preferences
     where phone = $1
     limit 1`,
    [input.fromPhone]
  );
  const donorId = preferenceResult.rows[0]?.donor_id;
  if (!donorId) return;

  await transaction(async (client) => {
    await client.query(
      `insert into public.sms_messages (
         donor_id, direction, category, to_phone, from_phone, body, status,
         provider_message_sid, sent_at
       ) values ($1, 'INBOUND', 'REPLY', $2, $3, $4, 'RECEIVED', $5, now())
       on conflict (provider_message_sid) do nothing`,
      [Number(donorId), input.toPhone, input.fromPhone, input.body, input.providerSid]
    );

    if (input.optOutType === "STOP") {
      await client.query(
        `update public.donor_sms_preferences
         set consent_status = 'OPTED_OUT', opted_out_at = now()
         where donor_id = $1`,
        [Number(donorId)]
      );
    } else if (input.optOutType === "START") {
      await client.query(
        `update public.donor_sms_preferences
         set consent_status = 'OPTED_IN', consent_at = now(), opted_out_at = null,
             consent_source = 'Twilio START reply'
         where donor_id = $1`,
        [Number(donorId)]
      );
    }
  });
}
