import { type FastifyInstance, type FastifyPluginAsync } from "fastify";

import authRoutes from "./auth.routes.js";
import binanceRoutes from "./binance.routes.js";
import usersRoutes from "./users.routes.js";
import ordersRoute from "./orders.routes.js";
import userStreamRoutes from "./user-stream.routes.js";
import geminiRoutes from "./gemini.routes.js";
import claudeRoutes from "./claude.routes.js";
import chatRoutes from "./chat.routes.js";
import tradeBotRoutes from "./trade-bot.routes.js";
import { sessionHook } from "../hooks/session.hook.js";
import healthRoutes from "./health.routes.js";

const appRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  await fastify.register(healthRoutes);

  fastify.addHook("onRequest", sessionHook);

  fastify.register(authRoutes);
  fastify.register(binanceRoutes);
  fastify.register(usersRoutes);
  fastify.register(ordersRoute);
  fastify.register(userStreamRoutes);

  fastify.register(geminiRoutes);
  fastify.register(claudeRoutes);
  fastify.register(chatRoutes);
  fastify.register(tradeBotRoutes);
};

export default appRoutes;
