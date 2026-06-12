import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";

import { GeminiService } from "../services/gemini.service.js";
import { ROUTES } from "../config/app-routes.js";
import Conversation from "../schema/conversation.schema.js";
import { MAX_HISTORY_MESSAGES } from "../constants/auth.constant.js";
import { BearerAuth } from "../schemas/shared.schema.js";

const AIChatSchema = {
  description:
    "Gemini AI Chat. History is managed server-side per session (authenticated or anonymous).",
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
  description: "Gemini AI Analyze Market.",
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

const geminiRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const geminiService = new GeminiService(fastify.config.GEMINI_API_KEY);

  fastify.post(
    ROUTES.GEMINI_CHAT,
    { schema: AIChatSchema },
    async (request, reply) => {
      try {
        const { message } = request.body as { message: string };
        const identifier = request.sessionIdentifier;

        // Read server-side conversation history (same pattern as Claude)
        const convo = await Conversation.findOne({ identifier, deletedAt: null })
          .sort({ createdAt: -1 })
          .lean();

        const history = (convo?.messages ?? [])
          .filter((m) => m.status === "accepted")
          .map((m) => ({ role: m.role, content: m.content }));

        const result = await geminiService.chat(message, history);

        const status: "accepted" | "rejected" =
          result?.status === "accepted" ? "accepted" : "rejected";

        const newMessages = [
          { role: "user" as const, status, content: message },
          { role: "assistant" as const, status, content: result?.message ?? "" },
        ];

        if (convo) {
          await Conversation.findOneAndUpdate(
            { identifier, deletedAt: null },
            {
              $push: {
                messages: { $each: newMessages, $slice: -MAX_HISTORY_MESSAGES },
              },
            },
            { sort: { createdAt: -1 } },
          );
        } else {
          await Conversation.create({ identifier, messages: newMessages, deletedAt: null });
        }

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
    ROUTES.GEMINI_ANALYZE_MARKET,
    { schema: AIAnalyzeSchema },
    async (request, reply) => {
      try {
        const { symbol, interval } = request.body as { symbol: string; interval: string };

        if (!symbol || !interval) {
          return reply.code(400).send({ error: "Invalid request." });
        }

        const result = await geminiService.analyze(symbol, interval);
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
