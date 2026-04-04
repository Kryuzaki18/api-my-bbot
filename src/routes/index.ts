import { type FastifyInstance, type FastifyPluginAsync } from "fastify";

import authRoutes from "./auth.routes.js";
import binanceRoutes from "./binance.routes.js";
import userInfoRoutes from "./user-info.routes.js";
import ordersRoute from "./orders.routes.js";
import userStreamRoutes from "./user-stream.routes.js";

const appRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.register(authRoutes);
  fastify.register(binanceRoutes);
  fastify.register(userInfoRoutes);
  fastify.register(ordersRoute);
  fastify.register(userStreamRoutes);
};

export default appRoutes;
