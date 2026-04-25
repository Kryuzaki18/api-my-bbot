import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";

import { ROUTES } from "../config/app-routes.js";
import { binanceService } from "../services/binance.singleton.js";
import { authHook } from "../hooks/auth.hook.js";
import { sendError } from "../utils/reply.util.js";
import { BearerAuth, StandardErrors } from "../schemas/shared.schema.js";

const LeverageBracketSchema = {
  description: "Get the user's current leverage brackets for a specific symbol.",
  tags: ["Leverage-Bracket"],
  security: BearerAuth,
  body: Type.Object({
    symbol: Type.Optional(Type.String({ minLength: 1, examples: ["BTCUSDT"] })),
  }),
  response: { 200: Type.Any(), ...StandardErrors },
};

const CommissionRateSchema = {
  description: "Get the user's current commission rate for a specific symbol.",
  tags: ["Commission-Rates"],
  security: BearerAuth,
  body: Type.Object({
    symbols: Type.Optional(
      Type.Array(Type.String({ minLength: 1, examples: ["BTCUSDT"] })),
    ),
  }),
  response: { 200: Type.Any(), ...StandardErrors },
};

const binanceRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook("onRequest", authHook);

  fastify.post(ROUTES.FUTURES_LEVERAGE_BRACKET, { schema: LeverageBracketSchema }, async (request, reply) => {
    try {
      const { apiKey, apiSecret, useTestnet } = request.user;
      const body = request.body as any;
      const symbol = body.symbol ? body.symbol.toUpperCase() : undefined;

      return reply.code(200).send(
        await binanceService.getLeverageBracket(apiKey!, apiSecret!, useTestnet, symbol),
      );
    } catch (error) {
      return sendError(reply, error);
    }
  });

  fastify.post(ROUTES.FUTURES_COMMISSION_RATE, { schema: CommissionRateSchema }, async (request, reply) => {
    try {
      const { apiKey, apiSecret, useTestnet } = request.user;
      const { symbols } = request.body as any;

      return reply.code(200).send(
        await binanceService.getCommissionRate(apiKey!, apiSecret!, useTestnet, symbols),
      );
    } catch (error) {
      return sendError(reply, error);
    }
  });
};

export default binanceRoutes;
