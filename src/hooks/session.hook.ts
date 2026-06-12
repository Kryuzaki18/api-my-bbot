import { type FastifyReply, type FastifyRequest } from "fastify";
import { randomUUID } from "crypto";

import {
  ANON_COOKIE_NAME,
  THIRTY_DAYS_SECONDS,
} from "../constants/auth.constant.js";

/**
 * Universal session hook — works for both authenticated and anonymous users.
 *
 * Resolution order:
 *   1. Valid `session` JWT cookie  → use email or apiKey as identifier
 *   2. Valid `anon_session` JWT cookie → reuse existing anonymous identity
 *   3. Neither / expired           → mint a new UUID, set `anon_session` cookie
 *
 * Sets `request.sessionIdentifier` and `request.isAnonymousSession` so all
 * downstream routes get a stable, guaranteed key without needing to call 401.
 */
export async function sessionHook(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // With trustProxy: true in Fastify, request.protocol correctly reflects the
  // outer protocol (https) even when the Node process itself is on plain HTTP
  // behind Nginx/ALB. Without this, secure: true gets set but the browser
  // rejects the cookie because it came over what it sees as an HTTP hop.
  const secure = request.protocol === "https";
  const sameSite = secure ? ("none" as const) : ("lax" as const);

  try {
    await request.jwtVerify();
    const { email, apiKey, isAnonymous } = request.user;

    if (!isAnonymous) {
      if (email) {
        request.sessionIdentifier = email;
        request.isAnonymousSession = false;
        return;
      }
      if (apiKey) {
        request.sessionIdentifier = `key:${apiKey}`;
        request.isAnonymousSession = false;
        return;
      }
    }
  } catch {
  }

  const rawAnonToken = (request.cookies as Record<string, string | undefined>)[ANON_COOKIE_NAME];

  if (rawAnonToken) {
    try {
      const decoded = await request.server.jwt.verify<{
        anonymousId: string;
        isAnonymous: boolean;
      }>(rawAnonToken);

      if (decoded.anonymousId && decoded.isAnonymous) {
        request.sessionIdentifier = `anon:${decoded.anonymousId}`;
        request.isAnonymousSession = true;
        return;
      }
    } catch {
      reply.clearCookie(ANON_COOKIE_NAME, { path: "/", secure, sameSite });
    }
  }

  // crypto.randomUUID() emits RFC 4122 v4 UUIDs backed by OS-level CSPRNG.
  // Collision probability per UUID is ~5.3 × 10⁻³⁶ — practically zero.
  const anonymousId = randomUUID();

  const anonToken = request.server.jwt.sign(
    { anonymousId, isAnonymous: true },
    { expiresIn: "30d" },
  );

  reply.setCookie(ANON_COOKIE_NAME, anonToken, {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    maxAge: THIRTY_DAYS_SECONDS,
  });

  request.sessionIdentifier = `anon:${anonymousId}`;
  request.isAnonymousSession = true;
}
