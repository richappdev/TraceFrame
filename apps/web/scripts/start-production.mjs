const required = [
  "BANGUMI_CLIENT_ID",
  "BANGUMI_CLIENT_SECRET",
  "BANGUMI_REDIRECT_URI",
  "SESSION_SECRET",
];

if (process.env.NODE_ENV !== "production") {
  throw new Error("start-production.mjs requires NODE_ENV=production");
}
if (process.env.APP_STORE !== "firestore") {
  throw new Error("APP_STORE=firestore is required in production");
}
for (const name of required) {
  if (!(process.env[name] ?? "").trim()) {
    throw new Error(`${name} is required in production`);
  }
}
if (process.env.SESSION_SECRET.trim().length < 32) {
  throw new Error("SESSION_SECRET must contain at least 32 characters in production");
}

let redirect;
try {
  redirect = new URL(process.env.BANGUMI_REDIRECT_URI);
} catch {
  throw new Error("BANGUMI_REDIRECT_URI must be an absolute URL");
}
if (redirect.protocol !== "https:" || redirect.pathname !== "/api/auth/callback") {
  throw new Error("BANGUMI_REDIRECT_URI must use HTTPS and end at /api/auth/callback");
}

await import("./server.js");
