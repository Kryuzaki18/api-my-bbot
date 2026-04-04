import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";

import { ROUTES } from "../config/app-routes.js";
import { BinanceService } from "../services/binance.service.js";

const LeverageBracketSchema = {
  description:
    "Get the user's current leverage brackets for a specific symbol.",
  tags: ["Orders"],
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
        const { apiKey, apiSecret, useTestnet } = request.user;
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
};

export default binanceRoutes;
