import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { UserRole } from "@prisma/client";

export const AUTH_COOKIE_NAME = "oilchanger_session";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

export type AuthSessionPayload = {
  userId: string;
  role: UserRole;
  tenantId: string;
  shopId: string;
  countryCode: string;
  exp: number;
};

export function createSessionToken(payload: AuthSessionPayload, secret = getSessionSecret()): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = sign(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string, secret = getSessionSecret(), nowSeconds = currentSeconds()) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload, secret);

  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AuthSessionPayload;

    if (payload.exp < nowSeconds) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function setAuthSession(payload: Omit<AuthSessionPayload, "exp">) {
  const expiresAt = currentSeconds() + SESSION_TTL_SECONDS;
  const token = createSessionToken({ ...payload, exp: expiresAt });
  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function getAuthSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

export async function clearAuthSession() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function getSessionSecret(): string {
  return process.env.NEXTAUTH_SECRET ?? "oilchanger-local-dev-secret";
}

function currentSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
