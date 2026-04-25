import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";

import { ROUTES } from "../config/app-routes.js";
import { binanceService } from "../services/binance.singleton.js";
import { authHook } from "../hooks/auth.hook.js";
import { sendError } from "../utils/reply.util.js";
import { BearerAuth } from "../schemas/shared.schema.js";

const GetUserStreamSchema = {
  description: "Starts a new user data stream and returns a listenKey.",
  tags: ["User Stream"],
  security: BearerAuth,
  response: {
    200: Type.Object({ listenKey: Type.String() }),
    400: Type.Any(),
    500: Type.Any(),
  },
};

const KeepAliveUserStreamSchema = {
  description:
    "Pings a listenKey to keep it alive. Should be called every 30 minutes.",
  tags: ["User Stream"],
  security: BearerAuth,
  response: { 200: Type.Any(), 400: Type.Any(), 500: Type.Any() },
};

const CloseUserStreamSchema = {
  description: "Closes out a user data stream.",
  tags: ["User Stream"],
  security: BearerAuth,
  response: { 200: Type.Any(), 400: Type.Any(), 500: Type.Any() },
};

const userStreamRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook("onRequest", authHook);

  fastify.post(ROUTES.USER_STREAM, { schema: GetUserStreamSchema }, async (request, reply) => {
    try {
      const { apiKey, useTestnet } = request.user;
      return reply.code(200).send(
        await binanceService.getListenKey(apiKey!, useTestnet),
      );
    } catch (error) {
      return sendError(reply, error);
    }
  });

  fastify.put(ROUTES.USER_STREAM, { schema: KeepAliveUserStreamSchema }, async (request, reply) => {
    try {
      const { apiKey, useTestnet } = request.user;
      return reply.code(200).send(
        await binanceService.keepAliveListenKey(apiKey!, useTestnet),
      );
    } catch (error) {
      return sendError(reply, error);
    }
  });

  fastify.delete(ROUTES.USER_STREAM, { schema: CloseUserStreamSchema }, async (request, reply) => {
    try {
      const { apiKey, useTestnet } = request.user;
      return reply.code(200).send(
        await binanceService.closeListenKey(apiKey!, useTestnet),
      );
    } catch (error) {
      return sendError(reply, error);
    }
  });
};

export default userStreamRoutes;
