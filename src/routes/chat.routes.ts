import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";

import { ROUTES } from "../config/app-routes.js";
import Conversation from "../schema/conversation.schema.js";
import { BearerAuth, StandardErrors } from "../schemas/shared.schema.js";

const HistoryGetSchema = {
  description: "Get chat history for the current session (authenticated or anonymous).",
  tags: ["AI Chat"],
  security: BearerAuth,
  response: {
    200: Type.Array(
      Type.Object({
        role: Type.Union([Type.Literal("user"), Type.Literal("assistant")]),
        status: Type.Union([Type.Literal("accepted"), Type.Literal("rejected")]),
        content: Type.String(),
        createdAt: Type.String(),
      }),
    ),
    ...StandardErrors,
  },
};

const HistoryDeleteSchema = {
  description: "Clear chat history for the current session.",
  tags: ["AI Chat"],
  security: BearerAuth,
  response: {
    200: Type.Object({ message: Type.String() }),
    ...StandardErrors,
  },
};

const chatRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get(
    ROUTES.CHAT_HISTORY,
    { schema: HistoryGetSchema },
    async (request, reply) => {
      try {
        const identifier = request.sessionIdentifier;
        const conv = await Conversation.findOne({ identifier, deletedAt: null })
          .sort({ createdAt: -1 })
          .lean();
        return reply.code(200).send(conv?.messages ?? []);
      } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({ error: "Internal Server Error", details: error.message });
      }
    },
  );

  fastify.delete(
    ROUTES.CHAT_HISTORY,
    { schema: HistoryDeleteSchema },
    async (request, reply) => {
      try {
        const identifier = request.sessionIdentifier;
        await Conversation.findOneAndUpdate(
          { identifier, deletedAt: null },
          { $set: { deletedAt: new Date() } },
          { sort: { createdAt: -1 } },
        );
        return reply.code(200).send({ message: "Conversation cleared." });
      } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({ error: "Internal Server Error", details: error.message });
      }
    },
  );
};

export default chatRoutes;
