export async function submitSmsRequest(url: string, data: unknown, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
      body: JSON.stringify(data), signal: controller.signal
    });
    if (response.status === 401 || response.status === 403) throw new Error("Your session expired or you do not have permission. Sign in again before continuing.");
    let payload: { ok?: boolean; error?: string; scheduled?: boolean };
    try { payload = await response.json(); }
    catch { throw new Error("The server returned an unexpected response. The result is not confirmed; refresh and check before retrying."); }
    if (!payload || typeof payload !== "object") throw new Error("The result could not be confirmed. Refresh and check before retrying.");
    if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "The request could not be confirmed. Refresh and check before retrying.");
    if (payload.ok !== true) throw new Error("The server did not confirm success. Refresh and check before retrying.");
    return payload;
  } catch (error) {
    if (controller.signal.aborted) throw new Error("The request timed out. It may still complete on the server. Refresh and check the saved preference or message history before retrying.");
    if (error instanceof TypeError) throw new Error("Connection interrupted. The result is not confirmed; refresh and check before retrying.");
    throw error;
  } finally { clearTimeout(timeout); }
}
