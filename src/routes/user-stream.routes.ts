import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";

import { BinanceService } from "../services/binance.service.js";
import { ROUTES } from "../config/app-routes.js";
import User from "../schema/users.schema.js";

const GetStreamSchema = {
  description: "Starts a new user data stream and returns a listenKey.",
  tags: ["User Stream"],
  security: [{ bearerAuth: [] }],
  response: {
    200: Type.Object({
      listenKey: Type.String(),
    }),
    400: Type.Any(),
    500: Type.Any(),
  },
};

const KeepAliveStreamSchema = {
  description:
    "Pings a listenKey to keep it alive. Should be called every 30 minutes.",
  tags: ["User Stream"],
  security: [{ bearerAuth: [] }],
  response: {
    200: Type.Any(),
    400: Type.Any(),
    500: Type.Any(),
  },
};

const CloseStreamSchema = {
  description: "Closes out a user data stream.",
  tags: ["User Stream"],
  security: [{ bearerAuth: [] }],
  response: {
    200: Type.Any(),
    400: Type.Any(),
    500: Type.Any(),
  },
};

const userStreamRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  const binanceService = new BinanceService();

  fastify.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
      if (request.user?.email) {
        const userDB = await User.findOne({ email: request.user.email }).lean();
        if (!userDB) throw new Error("Invalid session user");
        
        let useTestnet = request.user.useTestnet;
        if (request.body && typeof (request.body as any).useTestnet === "boolean") {
          useTestnet = (request.body as any).useTestnet;
          request.user.useTestnet = useTestnet;
        } else if (request.query && typeof (request.query as any).useTestnet === "string") {
          useTestnet = (request.query as any).useTestnet === "true";
          request.user.useTestnet = useTestnet;
        }

        const keys = useTestnet ? userDB.binanceKeys.test : userDB.binanceKeys.prod;
        request.user.apiKey = keys.apiKey;
        request.user.apiSecret = keys.apiSecret;
      }
    } catch (err) {
      reply.send(err);
    }
  });

  fastify.post(
    ROUTES.USER_STREAM,
    { schema: GetStreamSchema },
    async (request, reply) => {
      try {
        const { apiKey, useTestnet } = request.user as any;
        const result = await binanceService.getListenKey(apiKey, useTestnet);
        return reply.code(200).send(result);
      } catch (error: any) {
        if (error.status)
          return reply
            .code(error.status)
            .send({ error: error.message, details: error.details });
        return reply
          .code(500)
          .send({ error: "Internal Server Error", details: error.message });
      }
    },
  );

  fastify.put(
    ROUTES.USER_STREAM,
    { schema: KeepAliveStreamSchema },
    async (request, reply) => {
      try {
        const { apiKey, useTestnet } = request.user as any;
        const result = await binanceService.keepAliveListenKey(
          apiKey,
          useTestnet,
        );
        return reply.code(200).send(result);
      } catch (error: any) {
        if (error.status)
          return reply
            .code(error.status)
            .send({ error: error.message, details: error.details });
        return reply
          .code(500)
          .send({ error: "Internal Server Error", details: error.message });
      }
    },
  );

  fastify.delete(
    ROUTES.USER_STREAM,
    { schema: CloseStreamSchema },
    async (request, reply) => {
      try {
        const { apiKey, useTestnet } = request.user as any;
        const result = await binanceService.closeListenKey(apiKey, useTestnet);
        return reply.code(200).send(result);
      } catch (error: any) {
        if (error.status)
          return reply
            .code(error.status)
            .send({ error: error.message, details: error.details });
        return reply
          .code(500)
          .send({ error: "Internal Server Error", details: error.message });
      }
    },
  );
};

export default userStreamRoutes;
