import { query } from "../lib/db.js";
import { sendJson } from "../lib/http.js";

export default async function handler(_req, res) {
  try {
    const result = await query("select now() as server_time");
    sendJson(res, 200, {
      ok: true,
      serverTime: result.rows[0].server_time
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: "Database connection failed."
    });
  }
}
