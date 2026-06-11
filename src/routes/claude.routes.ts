import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";

import { ClaudeService } from "../services/claude.service.js";
import { ROUTES } from "../config/app-routes.js";
import { authHook } from "../hooks/auth.hook.js";
import Conversation from "../schema/conversation.schema.js";
import { BearerAuth, StandardErrors } from "../schemas/shared.schema.js";

const MAX_HISTORY_MESSAGES = 100;

const ConversationMessageSchema = Type.Object({
  role: Type.Union([Type.Literal("user"), Type.Literal("assistant")]),
  content: Type.String(),
});

const AIChatSchema = {
  description: "Claude AI Chat. History is managed server-side.",
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

const HistoryGetSchema = {
  description: "Get Claude chat history for the authenticated user.",
  tags: ["AI Chat"],
  security: BearerAuth,
  response: {
    200: Type.Array(
      Type.Object({
        role: Type.Union([Type.Literal("user"), Type.Literal("assistant")]),
        content: Type.String(),
        createdAt: Type.String(),
      }),
    ),
    ...StandardErrors,
  },
};

const HistoryDeleteSchema = {
  description: "Clear Claude chat history for the authenticated user.",
  tags: ["AI Chat"],
  security: BearerAuth,
  response: {
    200: Type.Object({ message: Type.String() }),
    ...StandardErrors,
  },
};

const claudeRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook("onRequest", authHook);

  const claudeService = new ClaudeService(fastify.config.CLAUDE_API_KEY);

  fastify.post(
    ROUTES.CLAUDE_CHAT,
    { schema: AIChatSchema },
    async (request, reply) => {
      try {
        const { message } = request.body as { message: string };
        const email = request.user.email!;

        const conv = await Conversation.findOne({ email }).lean();
        const history = (conv?.messages ?? []).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const result = await claudeService.chat(message, history);

        await Conversation.findOneAndUpdate(
          { email },
          {
            $push: {
              messages: {
                $each: [
                  { role: "user", content: message },
                  { role: "assistant", content: result.message },
                ],
                $slice: -MAX_HISTORY_MESSAGES,
              },
            },
          },
          { upsert: true },
        );

        return reply.code(200).send(result);
      } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({ error: "Internal Server Error", details: error.message });
      }
    },
  );

  fastify.get(
    ROUTES.CLAUDE_HISTORY,
    { schema: HistoryGetSchema },
    async (request, reply) => {
      try {
        const email = request.user.email!;
        const conv = await Conversation.findOne({ email }).lean();
        return reply.code(200).send(conv?.messages ?? []);
      } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({ error: "Internal Server Error", details: error.message });
      }
    },
  );

  fastify.delete(
    ROUTES.CLAUDE_HISTORY,
    { schema: HistoryDeleteSchema },
    async (request, reply) => {
      try {
        const email = request.user.email!;
        await Conversation.findOneAndUpdate(
          { email },
          { $set: { messages: [] } },
          { upsert: true },
        );
        return reply.code(200).send({ message: "Conversation cleared." });
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
