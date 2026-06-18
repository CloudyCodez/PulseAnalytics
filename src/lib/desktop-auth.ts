import crypto from "crypto";

export type DesktopAuthPayload = {
  email: string;
  clerkUserId: string;
  plan: string;
  exp: number;
  nonce: string;
};

function getSecret() {
  return (
    process.env.DESKTOP_AUTH_SECRET ||
    process.env.ENCRYPTION_KEY ||
    process.env.CLERK_SECRET_KEY ||
    ""
  );
}

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function unbase64url(input: string) {
  const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

export function createDesktopAuthToken(payload: Omit<DesktopAuthPayload, "nonce">) {
  const secret = getSecret();
  if (!secret) throw new Error("Desktop auth secret is not configured.");

  const body = base64url(JSON.stringify({ ...payload, nonce: crypto.randomUUID() }));
  const sig = base64url(crypto.createHmac("sha256", secret).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyDesktopAuthToken(token: string): DesktopAuthPayload {
  const secret = getSecret();
  if (!secret) throw new Error("Desktop auth secret is not configured.");

  const [body, sig] = token.split(".");
  if (!body || !sig) throw new Error("Invalid token.");

  const expected = base64url(crypto.createHmac("sha256", secret).update(body).digest());
  const actualBuffer = Buffer.from(sig);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new Error("Invalid token signature.");
  }

  const payload = JSON.parse(unbase64url(body)) as DesktopAuthPayload;
  if (!payload.email || !payload.clerkUserId || !payload.exp) {
    throw new Error("Invalid token payload.");
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired.");
  }
  return payload;
}
