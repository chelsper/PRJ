import { requireApiToken } from "../../lib/auth.js";
import { query } from "../../lib/db.js";
import { allowMethods, sendJson } from "../../lib/http.js";
import { giftSchema } from "../../lib/validators.js";

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["GET", "POST"])) {
    return;
  }

  const auth = requireApiToken(req);
  if (!auth.ok) {
    sendJson(res, auth.status, auth.body);
    return;
  }

  try {
    if (req.method === "GET") {
      const result = await query(
        `select
          g.id,
          g.donor_id as "donorId",
          g.amount_cents / 100.0 as amount,
          g.currency_code as "currencyCode",
          g.gift_date as "giftDate",
          g.gift_type as "giftType",
          g.payment_method as "paymentMethod",
          g.campaign,
          g.fund,
          g.appeal,
          g.receipt_number as "receiptNumber",
          g.is_anonymous as "isAnonymous",
          g.created_at as "createdAt",
          d.first_name as "donorFirstName",
          d.last_name as "donorLastName",
          d.organization_name as "organizationName"
        from gifts g
        inner join donors d on d.id = g.donor_id
        order by g.gift_date desc, g.created_at desc
        limit 100`
      );

      sendJson(res, 200, { gifts: result.rows });
      return;
    }

    const payload = giftSchema.parse(req.body);
    const result = await query(
      `insert into gifts (
        donor_id,
        amount_cents,
        currency_code,
        gift_date,
        gift_type,
        payment_method,
        campaign,
        fund,
        appeal,
        receipt_number,
        is_anonymous,
        notes
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      )
      returning
        id,
        donor_id as "donorId",
        amount_cents / 100.0 as amount,
        currency_code as "currencyCode",
        gift_date as "giftDate",
        gift_type as "giftType",
        payment_method as "paymentMethod",
        campaign,
        fund,
        appeal,
        receipt_number as "receiptNumber",
        is_anonymous as "isAnonymous",
        created_at as "createdAt"`,
      [
        payload.donorId,
        Math.round(payload.amount * 100),
        payload.currencyCode.toUpperCase(),
        payload.giftDate,
        payload.giftType,
        payload.paymentMethod,
        payload.campaign ?? null,
        payload.fund ?? null,
        payload.appeal ?? null,
        payload.receiptNumber ?? null,
        payload.isAnonymous,
        payload.notes ?? null
      ]
    );

    sendJson(res, 201, { gift: result.rows[0] });
  } catch (error) {
    if (error.name === "ZodError") {
      sendJson(res, 400, {
        error: "Invalid gift payload.",
        details: error.flatten()
      });
      return;
    }

    if (error.code === "23503") {
      sendJson(res, 400, { error: "The donorId does not exist." });
      return;
    }

    sendJson(res, 500, { error: "Unable to process gift request." });
  }
}
