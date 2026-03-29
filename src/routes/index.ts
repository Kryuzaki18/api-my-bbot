import { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import authRoutes from './auth.js';
import userInfoRoutes from './user-info.js';
import ordersRoute from './orders.js';
import userStreamRoutes from './user-stream.js';

const appRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.register(authRoutes);
  fastify.register(userInfoRoutes);
  fastify.register(ordersRoute);
  fastify.register(userStreamRoutes);
};

export default appRoutes;
