import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";

import { ClaudeService } from "../services/claude.service.js";
import { ROUTES } from "../config/app-routes.js";

const ConversationMessageSchema = Type.Object({
  role: Type.Union([Type.Literal("user"), Type.Literal("assistant")]),
  content: Type.String(),
});

const AIChatSchema = {
  description: "Claude AI Chat.",
  tags: ["AI Chat"],
  body: Type.Object({
    message: Type.String({ minLength: 3 }),
    history: Type.Optional(Type.Array(ConversationMessageSchema)),
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
  description: "Claude AI Analyze Market.",
  tags: ["AI Analyze"],
  body: Type.Object({
    symbol: Type.String({ minLength: 3 }),
    interval: Type.String({ minLength: 2 }),
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

const claudeRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const claudeService = new ClaudeService(fastify.config.CLAUDE_API_KEY);

  fastify.post(
    ROUTES.CLAUDE_CHAT,
    { schema: AIChatSchema },
    async (request, reply) => {
      try {
        const { message, history = [] } = request.body as any;

        if (message === undefined) {
          return reply.code(400).send({ error: "Invalid request." });
        }

        const result = await claudeService.chat(message, history);
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
    ROUTES.CLAUDE_ANALYZE_MARKET,
    { schema: AIAnalyzeSchema },
    async (request, reply) => {
      try {
        const { symbol, interval } = request.body as any;

        if (symbol === undefined || interval === undefined) {
          return reply.code(400).send({ error: "Invalid request." });
        }

        const result = await claudeService.analyze(symbol, interval);
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

export default claudeRoutes;
