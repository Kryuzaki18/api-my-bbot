import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";

import { ClaudeService } from "../services/claude.service.js";
import { ROUTES } from "../config/app-routes.js";
import Conversation from "../schema/conversation.schema.js";
import { BearerAuth } from "../schemas/shared.schema.js";

const AIChatSchema = {
  description: "Claude AI Chat. History is managed server-side per session (authenticated or anonymous).",
  tags: ["AI Chat"],
  security: BearerAuth,
  body: Type.Object({
    message: Type.String({ minLength: 3 }),
  }),
  response: {
    200: Type.Any(),
    400: Type.Object({ error: Type.String(), details: Type.Optional(Type.Any()) }),
    500: Type.Object({ error: Type.String(), details: Type.Optional(Type.Any()) }),
  },
};

const AIAnalyzeSchema = {
  description: "Claude AI Analyze Market.",
  tags: ["AI Analyze"],
  security: BearerAuth,
  body: Type.Object({
    symbol: Type.String({ minLength: 3 }),
    interval: Type.String({ minLength: 2 }),
  }),
  response: {
    200: Type.Any(),
    400: Type.Object({ error: Type.String(), details: Type.Optional(Type.Any()) }),
    500: Type.Object({ error: Type.String(), details: Type.Optional(Type.Any()) }),
  },
};

const claudeRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const claudeService = new ClaudeService(fastify.config.CLAUDE_API_KEY);

  fastify.post(
    ROUTES.CLAUDE_CHAT,
    { schema: AIChatSchema },
    async (request, reply) => {
      try {
        const { message } = request.body as { message: string };
        const identifier = request.sessionIdentifier;

        const convo = await Conversation.findOne({ identifier, deletedAt: null }).sort({ createdAt: -1 }).lean();
        const history = (convo?.messages ?? [])
          .filter((m) => m.status === "accepted")
          .map((m) => ({ role: m.role, content: m.content }));
          
        const result = await claudeService.chat(identifier, message, history, !!convo);

        return reply.code(200).send(result);
      } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({ error: "Internal Server Error", details: error.message });
      }
    },
  );

  fastify.post(
    ROUTES.CLAUDE_ANALYZE_MARKET,
    { schema: AIAnalyzeSchema },
    async (request, reply) => {
      try {
        const { symbol, interval } = request.body as { symbol: string; interval: string };

        if (symbol === undefined || interval === undefined) {
          return reply.code(400).send({ error: "Invalid request." });
        }

        const result = await claudeService.analyze(symbol, interval);
        return reply.code(200).send(result);
      } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({ error: "Internal Server Error", details: error.message });
      }
    },
  );
};

export default claudeRoutes;
