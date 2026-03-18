export function requireApiToken(req) {
  const configuredToken = process.env.API_TOKEN;

  if (!configuredToken) {
    return {
      ok: false,
      status: 500,
      body: { error: "API_TOKEN is not configured." }
    };
  }

  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || token !== configuredToken) {
    return {
      ok: false,
      status: 401,
      body: { error: "Unauthorized." }
    };
  }

  return { ok: true };
}
