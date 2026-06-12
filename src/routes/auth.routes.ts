import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";
import bcrypt from "bcrypt";

import { ROUTES } from "../config/app-routes.js";
import { binanceService } from "../services/binance.singleton.js";
import {
  ANON_COOKIE_NAME,
  COOKIE_NAME,
  MAX_HISTORY_MESSAGES,
  SALT_ROUNDS,
  SEVEN_DAYS_SECONDS,
} from "../constants/auth.constant.js";
import { EMAIL_REGEX } from "../constants/regex.constant.js";
import { ErrorBody } from "../schemas/shared.schema.js";
import User from "../schema/users.schema.js";
import Conversation from "../schema/conversation.schema.js";

const cookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: maxAgeSeconds,
});

/**
 * After a successful sign-in, check whether the browser carries an anonymous
 * session cookie. If it does, append those messages to the authenticated user's
 * conversation, then delete the anonymous document and clear the cookie.
 *
 * This gives users a seamless transition: chat history they built while browsing
 * anonymously carries over the moment they log in.
 */
async function mergeAnonHistory(
  fastify: FastifyInstance,
  anonToken: string | undefined,
  userIdentifier: string,
  reply: Parameters<FastifyPluginAsync>[1],
): Promise<void> {
  if (!anonToken) return;

  let anonymousId: string;

  try {
    const decoded = fastify.jwt.verify<{
      anonymousId: string;
      isAnonymous: boolean;
    }>(anonToken);

    if (!decoded.anonymousId || !decoded.isAnonymous) return;
    anonymousId = decoded.anonymousId;
  } catch {
    // Expired or tampered cookie — nothing to merge, just clean up
    reply.clearCookie(ANON_COOKIE_NAME, { path: "/" });
    return;
  }

  const anonIdentifier = `anon:${anonymousId}`;
  const anonConv = await Conversation.findOne({ identifier: anonIdentifier }).lean();

  if (!anonConv || anonConv.messages.length === 0) {
    reply.clearCookie(ANON_COOKIE_NAME, { path: "/" });
    return;
  }

  // Append anon messages after any existing authenticated history (they are newer —
  // the user was chatting anonymously after a prior sign-out).
  await Conversation.findOneAndUpdate(
    { identifier: userIdentifier },
    {
      $push: {
        messages: {
          $each: anonConv.messages,
          $slice: -MAX_HISTORY_MESSAGES,
        },
      },
    },
    { upsert: true },
  );

  await Conversation.deleteOne({ identifier: anonIdentifier });
  reply.clearCookie(ANON_COOKIE_NAME, { path: "/" });
}

const SignupSchema = {
  description:
    "Registers a new user. Validates email format, username/email uniqueness, and hashes the password with bcrypt before persisting.",
  tags: ["Authentication"],
  body: Type.Object({
    email: Type.String({
      minLength: 10,
      maxLength: 100,
      pattern: EMAIL_REGEX.source,
    }),
    password: Type.String({ minLength: 7 }),
    binanceKeys: Type.Object({
      test: Type.Object({
        apiKey: Type.String({ minLength: 10 }),
        apiSecret: Type.String({ minLength: 10 }),
      }),
      prod: Type.Object({
        apiKey: Type.String({ minLength: 10 }),
        apiSecret: Type.String({ minLength: 10 }),
      }),
    }),
  }),
  response: {
    201: Type.Object({ message: Type.String() }),
    400: ErrorBody,
    409: Type.Object({ error: Type.String(), field: Type.String() }),
    422: Type.Object({ error: Type.String() }),
  },
};

const MeSchema = {
  description:
    "Returns the current authenticated session payload. Requires a valid session cookie.",
  tags: ["Authentication"],
  security: [{ cookieAuth: [] }],
  response: {
    200: Type.Boolean(),
    401: Type.Object({ error: Type.String() }),
  },
};

const SigninSchema = {
  description:
    "Verifies Binance credentials by fetching account details and issues a secure httpOnly session cookie.",
  tags: ["Authentication"],
  body: Type.Object({
    apiKey: Type.String({ minLength: 10 }),
    apiSecret: Type.String({ minLength: 10 }),
    useTestnet: Type.Boolean({ default: true }),
  }),
  response: {
    200: Type.Object({ message: Type.String() }),
    400: ErrorBody,
    401: Type.Object({ error: Type.String() }),
  },
};

const SigninEmailSchema = {
  description:
    "Verifies user credentials by fetching account details and issues a secure httpOnly session cookie.",
  tags: ["Authentication"],
  body: Type.Object({
    email: Type.String({
      minLength: 10,
      maxLength: 100,
      pattern: EMAIL_REGEX.source,
    }),
    password: Type.String({ minLength: 7 }),
    useTestnet: Type.Boolean({ default: true }),
  }),
  response: {
    200: Type.Object({ message: Type.String() }),
    400: ErrorBody,
    401: Type.Object({ error: Type.String() }),
  },
};

const SignoutSchema = {
  description: "Clears the session cookie and terminates the current session.",
  tags: ["Authentication"],
  response: {
    200: Type.Object({ message: Type.String() }),
  },
};

const SwitchModeSchema = {
  description:
    "Switches current authenticated session mode between demo/live and refreshes session cookie.",
  tags: ["Authentication"],
  security: [{ cookieAuth: [] }],
  body: Type.Object({
    useTestnet: Type.Boolean(),
  }),
  response: {
    200: Type.Object({
      message: Type.String(),
      useTestnet: Type.Boolean(),
    }),
    401: Type.Object({ error: Type.String() }),
  },
};

const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post(ROUTES.SIGN_UP, { schema: SignupSchema }, async (request, reply) => {
    const { email, password, binanceKeys } = request.body as {
      email: string;
      password: string;
      binanceKeys: {
        test: { apiKey: string; apiSecret: string };
        prod: { apiKey: string; apiSecret: string };
      };
    };

    if (!EMAIL_REGEX.test(email)) {
      return reply.code(422).send({ error: "Invalid email address format" });
    }

    const existingByEmail = await User.findOne({
      email: email.toLowerCase().trim(),
    }).lean();

    if (existingByEmail) {
      return reply
        .code(409)
        .send({ error: "Email address is already taken", field: "email" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    try {
      await User.create({
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        binanceKeys: {
          test: {
            apiKey: binanceKeys.test.apiKey,
            apiSecret: binanceKeys.test.apiSecret,
          },
          prod: {
            apiKey: binanceKeys.prod.apiKey,
            apiSecret: binanceKeys.prod.apiSecret,
          },
        },
      });

      return reply.code(201).send({ message: "Account created successfully" });
    } catch (error: any) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern ?? {})[0] ?? "field";
        return reply.code(409).send({
          error: `${field.charAt(0).toUpperCase() + field.slice(1)} is already taken`,
          field,
        });
      }
      request.log.error(error);
      return reply.code(400).send({
        error: error.message || "Failed to create account",
        details: error.errors,
      });
    }
  });

  fastify.get(ROUTES.ME, { schema: MeSchema }, async (request, reply) => {
    try {
      await request.jwtVerify();
      const { email, apiKey } = request.user;

      let user = null;
      if (email) {
        user = await User.findOne({ email }).lean();
      } else if (apiKey) {
        user = await User.findOne({
          $or: [
            { "binanceKeys.test.apiKey": apiKey },
            { "binanceKeys.prod.apiKey": apiKey },
          ],
        }).lean();
      }

      if (!user) {
        return reply.code(401).send({ error: "Session expired or invalid" });
      }

      return reply.code(200).send(true);
    } catch {
      return reply.code(401).send({ error: "Session expired or invalid" });
    }
  });

  fastify.post(
    ROUTES.SIGN_IN,
    {
      schema: SigninSchema,
      config: { rateLimit: { max: 3, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      try {
        const { apiKey, apiSecret, useTestnet } = request.body as {
          apiKey: string;
          apiSecret: string;
          useTestnet: boolean;
        };

        await binanceService.getAccountInformation(apiKey, apiSecret, useTestnet);

        const token = fastify.jwt.sign(
          { apiKey, apiSecret, useTestnet },
          { expiresIn: "7d" },
        );

        reply.setCookie(COOKIE_NAME, token, cookieOptions(SEVEN_DAYS_SECONDS));

        // Carry over any anonymous chat history into this session
        const anonToken = (request.cookies as Record<string, string | undefined>)[ANON_COOKIE_NAME];
        await mergeAnonHistory(fastify, anonToken, `key:${apiKey}`, reply);

        return reply.code(200).send({ message: "Signed in successfully" });
      } catch (error: any) {
        if (error.status && error.status >= 400 && error.status < 500) {
          return reply
            .code(401)
            .send({ error: error.details?.msg || "Invalid API Keys or unauthorized." });
        }
        return reply
          .code(400)
          .send({ error: error.message || "Failed to sign in", details: error.details });
      }
    },
  );

  fastify.post(
    ROUTES.SIGN_IN_EMAIL,
    {
      schema: SigninEmailSchema,
      config: { rateLimit: { max: 3, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      try {
        const { email, password, useTestnet } = request.body as {
          email: string;
          password: string;
          useTestnet: boolean;
        };

        if (!EMAIL_REGEX.test(email)) {
          return reply.code(401).send({ error: "Invalid email address format" });
        }

        const user = await User.findOne({
          email: email.toLowerCase().trim(),
        }).lean();

        // Constant-time comparison even on "not found" to prevent user enumeration.
        const dummyHash =
          "$2b$12$invalidhashfortimingattackprevention000000000000000000";
        const passwordToCompare = user?.password ?? dummyHash;
        const isPasswordValid = await bcrypt.compare(password, passwordToCompare);

        if (!user || !isPasswordValid) {
          return reply.code(401).send({ error: "Invalid email or password" });
        }

        const token = fastify.jwt.sign(
          { email: user.email, useTestnet },
          { expiresIn: "7d" },
        );

        reply.setCookie(COOKIE_NAME, token, cookieOptions(SEVEN_DAYS_SECONDS));

        // Carry over any anonymous chat history into this session
        const anonToken = (request.cookies as Record<string, string | undefined>)[ANON_COOKIE_NAME];
        await mergeAnonHistory(fastify, anonToken, user.email, reply);

        return reply.code(200).send({ message: "Signed in successfully" });
      } catch (error: any) {
        if (error.status && error.status >= 400 && error.status < 500) {
          return reply
            .code(401)
            .send({ error: error.details?.msg || "Invalid credentials." });
        }
        return reply
          .code(400)
          .send({ error: error.message || "Failed to sign in", details: error.details });
      }
    },
  );

  fastify.post(ROUTES.SIGN_OUT, { schema: SignoutSchema }, async (_request, reply) => {
    // Clear auth session only. The anon_session cookie is intentionally kept so
    // the user can continue chatting anonymously after signing out and their
    // history persists if they sign back in.
    reply.clearCookie(COOKIE_NAME, { path: "/" });
    return reply.code(200).send({ message: "Signed out successfully" });
  });

  fastify.post(ROUTES.SWITCH_MODE, { schema: SwitchModeSchema }, async (request, reply) => {
    try {
      await request.jwtVerify();
      const { useTestnet } = request.body as { useTestnet: boolean };

      const { email, apiKey, apiSecret } = request.user;
      let payload: { email?: string; apiKey?: string; apiSecret?: string; useTestnet: boolean };
      if (email) {
        payload = { email, useTestnet };
      } else if (apiKey && apiSecret) {
        payload = { apiKey, apiSecret, useTestnet };
      } else {
        return reply.code(401).send({ error: "Session expired or invalid" });
      }

      const token = fastify.jwt.sign(payload, { expiresIn: "7d" });
      reply.setCookie(COOKIE_NAME, token, cookieOptions(SEVEN_DAYS_SECONDS));

      return reply.code(200).send({
        message: `Switched to ${useTestnet ? "demo" : "live"} mode successfully`,
        useTestnet,
      });
    } catch {
      return reply.code(401).send({ error: "Session expired or invalid" });
    }
  });
};

export default authRoutes;
