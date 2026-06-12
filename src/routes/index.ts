import { type FastifyInstance, type FastifyPluginAsync } from "fastify";

import authRoutes from "./auth.routes.js";
import binanceRoutes from "./binance.routes.js";
import usersRoutes from "./users.routes.js";
import ordersRoute from "./orders.routes.js";
import userStreamRoutes from "./user-stream.routes.js";
import geminiRoutes from "./gemini.routes.js";
import claudeRoutes from "./claude.routes.js";
import tradeBotRoutes from "./trade-bot.routes.js";

const appRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.register(authRoutes);
  fastify.register(binanceRoutes);
  fastify.register(usersRoutes);
  fastify.register(ordersRoute);
  fastify.register(userStreamRoutes);
  fastify.register(geminiRoutes);
  fastify.register(claudeRoutes);
  fastify.register(tradeBotRoutes);
};

export default appRoutes;
