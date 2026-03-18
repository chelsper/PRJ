export function sendJson(res, status, body) {
  res.status(status).json(body);
}

export function allowMethods(req, res, methods) {
  if (!methods.includes(req.method)) {
    res.setHeader("Allow", methods.join(", "));
    sendJson(res, 405, { error: "Method not allowed." });
    return false;
  }

  return true;
}
