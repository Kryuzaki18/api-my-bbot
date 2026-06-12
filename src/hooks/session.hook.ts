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
  const isProduction = process.env.NODE_ENV === "production";

  // ── 1. Try authenticated session cookie ───────────────────────────────────
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
        // API-key-only users: use a stable prefix so no collision with emails
        request.sessionIdentifier = `key:${apiKey}`;
        request.isAnonymousSession = false;
        return;
      }
    }
  } catch {
    // No valid auth session — fall through to anon check
  }

  // ── 2. Try existing anonymous session cookie ───────────────────────────────
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
      // Expired or tampered — clear it and issue a fresh one below
      reply.clearCookie(ANON_COOKIE_NAME, { path: "/" });
    }
  }

  // ── 3. Issue a brand-new anonymous session ─────────────────────────────────
  // crypto.randomUUID() emits RFC 4122 v4 UUIDs backed by OS-level CSPRNG.
  // Collision probability per UUID is ~5.3 × 10⁻³⁶ — practically zero.
  const anonymousId = randomUUID();

  const anonToken = request.server.jwt.sign(
    { anonymousId, isAnonymous: true },
    { expiresIn: "30d" },
  );

  reply.setCookie(ANON_COOKIE_NAME, anonToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS_SECONDS,
  });

  request.sessionIdentifier = `anon:${anonymousId}`;
  request.isAnonymousSession = true;
}
