import { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import ordersRoute from './orders.js';
import authRoutes from './auth.js';

const appRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.register(authRoutes);
  fastify.register(ordersRoute);
};

export default appRoutes;
