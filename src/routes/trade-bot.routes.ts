import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";

import { ROUTES } from "../config/app-routes.js";
import { authHook } from "../hooks/auth.hook.js";
import { sendError } from "../utils/reply.util.js";
import { BearerAuth, StandardErrors } from "../schemas/shared.schema.js";
import { TradeBotService } from "../services/trade-bot.service.js";
import { AIType } from "../models/ai.model.js";

const tradeBotService = new TradeBotService();

const TradeBotSchema = {
  description: "Auto trade bot endpoint using AI analysis + Binance execution.",
  tags: ["Trade-Bot"],
  security: BearerAuth,
  body: Type.Object({
    symbol: Type.String({ minLength: 3, examples: ["BTCUSDT"] }),
    interval: Type.String({ minLength: 2, examples: ["15m"] }),
    usdAmount: Type.Optional(Type.Number({ minimum: 0 })),
    leverage: Type.Optional(Type.Number({ minimum: 1, maximum: 125 })),
    useTestnet: Type.Optional(Type.Boolean()),
  }),
  response: {
    200: Type.Any(),
    ...StandardErrors,
  },
};

const tradeBotRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook("onRequest", authHook);

  fastify.post(ROUTES.TRADE_BOT, { schema: TradeBotSchema }, async (request, reply) => {
    try {
      const { apiKey, apiSecret, useTestnet } = request.user;
      const body = request.body as any;

      const result = await tradeBotService.execute({
        geminiApiKey: fastify.config.GEMINI_API_KEY,
        apiKey: apiKey!,
        apiSecret: apiSecret!,
        useTestnet: useTestnet ?? true,
        symbol: body.symbol,
        interval: body.interval,
        usdAmount: body.usdAmount,
        leverage: body.leverage,
        type: AIType.TRADE_BOT
      });

      return reply.code(200).send(result);
    } catch (error) {
      return sendError(reply, error);
    }
  });
};

export default tradeBotRoutes;
