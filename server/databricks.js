// Minimal Databricks API client for Model Serving.
// Uses the app's service principal or the forwarded user token.

export function isConfigured() {
  return Boolean(process.env.DATABRICKS_HOST || process.env.DATABRICKS_APP_PORT);
}

export async function api(req, path, { method = "GET", body, identity = "app" } = {}) {
  const host = process.env.DATABRICKS_HOST;
  if (!host) throw new Error("DATABRICKS_HOST is not set");
  const token = identity === "user" && req?.headers?.authorization
    ? req.headers.authorization.replace(/^Bearer\s+/i, "")
    : process.env.DATABRICKS_TOKEN;
  if (!token) throw new Error("No Databricks token available");
  const url = `https://${host}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Databricks API ${res.status}: ${text.slice(0, 400)}`);
  }
  return res;
}
