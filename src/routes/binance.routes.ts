import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";

import { ROUTES } from "../config/app-routes.js";
import { BinanceService } from "../services/binance.service.js";
import User from "../schema/users.schema.js";

const LeverageBracketSchema = {
  description:
    "Get the user's current leverage brackets for a specific symbol.",
  tags: ["Leverage-Bracket"],
  security: [{ bearerAuth: [] }],
  body: Type.Object({
    symbol: Type.Optional(Type.String({ minLength: 1, examples: ["BTCUSDT"] })),
  }),
  response: {
    200: Type.Any(),
    400: Type.Object({
      error: Type.String(),
      details: Type.Optional(Type.Any()),
    }),
    500: Type.Object({
      error: Type.String(),
      details: Type.Optional(Type.Any()),
    }),
  },
};

const CommissionRateSchema = {
  description: "Get the user's current commission rate for a specific symbol.",
  tags: ["Commission-Rates"],
  security: [{ bearerAuth: [] }],
  body: Type.Object({
    symbol: Type.Optional(Type.String({ minLength: 1, examples: ["BTCUSDT"] })),
  }),
  response: {
    200: Type.Any(),
    400: Type.Object({
      error: Type.String(),
      details: Type.Optional(Type.Any()),
    }),
    500: Type.Object({
      error: Type.String(),
      details: Type.Optional(Type.Any()),
    }),
  },
};

const binanceRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const binanceService = new BinanceService();

  fastify.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
      if (request.user?.email) {
        const userDB = await User.findOne({ email: request.user.email }).lean();
        if (!userDB) throw new Error("Invalid session user");

        let useTestnet = request.user.useTestnet;
        if (
          request.body &&
          typeof (request.body as any).useTestnet === "boolean"
        ) {
          useTestnet = (request.body as any).useTestnet;
          request.user.useTestnet = useTestnet;
        } else if (
          request.query &&
          typeof (request.query as any).useTestnet === "string"
        ) {
          useTestnet = (request.query as any).useTestnet === "true";
          request.user.useTestnet = useTestnet;
        }

        const keys = useTestnet
          ? userDB.binanceKeys.test
          : userDB.binanceKeys.prod;
        request.user.apiKey = keys.apiKey;
        request.user.apiSecret = keys.apiSecret;
      }
    } catch (err) {
      reply.send(err);
    }
  });

  fastify.post(
    ROUTES.FUTURES_LEVERAGE_BRACKET,
    { schema: LeverageBracketSchema },
    async (request, reply) => {
      try {
        const body = request.body as any;
        const { apiKey, apiSecret, useTestnet } = request.user as any;
        body.useTestnet = useTestnet;

        if (body.symbol) {
          body.symbol = body.symbol?.toUpperCase();
        }

        const result = await binanceService.getLeverageBracket(
          apiKey,
          apiSecret,
          body.useTestnet,
          body.symbol,
        );
        return reply.code(200).send(result);
      } catch (error: any) {
        request.log.error(error);
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

  fastify.post(
    ROUTES.FUTURES_COMMISSION_RATE,
    { schema: CommissionRateSchema },
    async (request, reply) => {
      try {
        const body = request.body as any;
        const { apiKey, apiSecret, useTestnet } = request.user as any;
        body.useTestnet = useTestnet;

        const result = await binanceService.getCommissionRate(
          apiKey,
          apiSecret,
          body.useTestnet,
          body.symbols,
        );
        return reply.code(200).send(result);
      } catch (error: any) {
        request.log.error(error);
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

export default binanceRoutes;
