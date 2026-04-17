import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";

import { GeminiService } from "../services/gemini.service.js";
import { ROUTES } from "../config/app-routes.js";

const AIChatSchema = {
  description: "AI Chat.",
  tags: ["AI Chat"],
  body: Type.Object({
    message: Type.String({ minLength: 3 }),
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

const AIAnalyzeSchema = {
  description: "AI Analyze Market.",
  tags: ["AI Analyze"],
  body: Type.Object({
    symbol: Type.String({ minLength: 3 }),
    timeframe: Type.String({ minLength: 3 }),
    plan: Type.Number(),
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

const geminiRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const geminiService = new GeminiService();

  fastify.post(
    ROUTES.AI_CHAT,
    { schema: AIChatSchema },
    async (request, reply) => {
      try {
        const { message } = request.body as any;

        if (message === undefined) {
          return reply.code(400).send({ error: "Invalid request." });
        }

        const result = await geminiService.chat(message);
        return reply.code(200).send(result);
      } catch (error: any) {
        request.log.error(error);
        return reply
          .code(500)
          .send({ error: "Internal Server Error", details: error.message });
      }
    },
  );

  fastify.post(
    ROUTES.AI_ANALYZE_MARKET,
    { schema: AIAnalyzeSchema },
    async (request, reply) => {
      try {
        const { symbol, timeframe } = request.body as any;

        if (symbol === undefined || timeframe === undefined) {
          return reply.code(400).send({ error: "Invalid request." });
        }

        const result = await geminiService.analyze(symbol, timeframe);
        return reply.code(200).send(result);
      } catch (error: any) {
        request.log.error(error);
        return reply
          .code(500)
          .send({ error: "Internal Server Error", details: error.message });
      }
    },
  );
};

export default geminiRoutes;
