import { requireApiToken } from "../../lib/auth.js";
import { query } from "../../lib/db.js";
import { allowMethods, sendJson } from "../../lib/http.js";
import { donorSchema } from "../../lib/validators.js";

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
          id,
          donor_type as "donorType",
          first_name as "firstName",
          last_name as "lastName",
          organization_name as "organizationName",
          email,
          phone,
          city,
          state_province as "stateProvince",
          country,
          created_at as "createdAt"
        from donors
        order by created_at desc
        limit 100`
      );

      sendJson(res, 200, { donors: result.rows });
      return;
    }

    const payload = donorSchema.parse(req.body);
    const result = await query(
      `insert into donors (
        donor_type,
        first_name,
        last_name,
        organization_name,
        email,
        phone,
        street1,
        street2,
        city,
        state_province,
        postal_code,
        country,
        notes
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      )
      returning
        id,
        donor_type as "donorType",
        first_name as "firstName",
        last_name as "lastName",
        organization_name as "organizationName",
        email,
        phone,
        city,
        state_province as "stateProvince",
        country,
        created_at as "createdAt"`,
      [
        payload.donorType,
        payload.firstName ?? null,
        payload.lastName ?? null,
        payload.organizationName ?? null,
        payload.email ?? null,
        payload.phone ?? null,
        payload.street1 ?? null,
        payload.street2 ?? null,
        payload.city ?? null,
        payload.stateProvince ?? null,
        payload.postalCode ?? null,
        payload.country,
        payload.notes ?? null
      ]
    );

    sendJson(res, 201, { donor: result.rows[0] });
  } catch (error) {
    if (error.name === "ZodError") {
      sendJson(res, 400, {
        error: "Invalid donor payload.",
        details: error.flatten()
      });
      return;
    }

    sendJson(res, 500, { error: "Unable to process donor request." });
  }
}
