import { type FastifyReply, type FastifyRequest } from "fastify";
import { randomUUID } from "crypto";

import {
  ANON_COOKIE_NAME,
  THIRTY_DAYS_SECONDS,
} from "../constants/auth.constant.js";

export async function sessionHook(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
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
  } catch {}

  const rawAnonToken = (request.cookies as Record<string, string | undefined>)[
    ANON_COOKIE_NAME
  ];

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
      reply.clearCookie(ANON_COOKIE_NAME, {
        path: "/",
        secure: true,
        sameSite: "lax" as const,
      });
    }
  }

  const anonymousId = randomUUID();

  const anonToken = request.server.jwt.sign(
    { anonymousId, isAnonymous: true },
    { expiresIn: "30d" },
  );

  reply.setCookie(ANON_COOKIE_NAME, anonToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: THIRTY_DAYS_SECONDS,
  });

  request.sessionIdentifier = `anon:${anonymousId}`;
  request.isAnonymousSession = true;
}
