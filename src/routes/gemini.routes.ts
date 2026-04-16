import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";

import { GeminiService } from "../services/gemini.service.js";
import { ROUTES } from "../config/app-routes.js";

const AISignalBasicSchema = {
  description: "AI Signal Basic.",
  tags: ["AI Signal Basic"],
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

const AISignalProSchema = {
  description: "AI Signal Pro.",
  tags: ["AI Signal Pro"],
  security: [{ bearerAuth: [] }],
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

const geminiRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const geminiService = new GeminiService();

  fastify.post(
    ROUTES.AI_SIGNAL_BASIC,
    { schema: AISignalBasicSchema },
    async (request, reply) => {
      try {
        const { message } = request.body as any;

        const result = await geminiService.signalBasic(message);
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
    ROUTES.AI_SIGNAL_PRO,
    { schema: AISignalProSchema },
    async (request, reply) => {
      try {
        const { message } = request.body as any;

        const result = await geminiService.signalPro(message);
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
