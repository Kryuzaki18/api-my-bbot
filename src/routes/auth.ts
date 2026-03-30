import { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { BinanceService } from '../services/binance.js';
import { ROUTES } from '../config/constants.js';

const SigninSchema = {
  description: 'Proves Binance credentials by fetching account details and issues a secure stateless JWT session token.',
  tags: ['Authentication'],
  body: Type.Object({
    apiKey: Type.String({ minLength: 10 }),
    apiSecret: Type.String({ minLength: 10 }),
    useTestnet: Type.Boolean({ default: true }),
  }),
  response: {
    200: Type.Object({
      token: Type.String(),
    }),
    400: Type.Object({
      error: Type.String(),
      details: Type.Optional(Type.Any())
    }),
    401: Type.Object({
      error: Type.String()
    })
  }
};

const SignoutSchema = {
  description: 'Endpoint to instruct the frontend to terminate the session token.',
  tags: ['Authentication'],
  response: {
    200: Type.Object({
      message: Type.String()
    })
  }
};

const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const binanceService = new BinanceService();

  fastify.post(ROUTES.SIGN_IN, { schema: SigninSchema }, async (request, reply) => {
    try {
      const { apiKey, apiSecret, useTestnet } = request.body as any;

      // Confirm credentials by checking account info
      await binanceService.getAccountInformation(apiKey, apiSecret, useTestnet);

      // Produce encrypted stateless session token containing credentials
      const token = fastify.jwt.sign({ apiKey, apiSecret, useTestnet }, { expiresIn: '7d' });

      return reply.code(200).send({ token });
    } catch (error: any) {
      if (error.status && error.status >= 400 && error.status < 500) {
        const msg = error.details?.msg || 'Invalid API Keys or unauthorized.';
        return reply.code(401).send({ error: msg });
      }
      return reply.code(400).send({ error: error.message || 'Failed to sign in', details: error.details });
    }
  });

  fastify.post(ROUTES.SIGN_OUT, { schema: SignoutSchema }, async (request, reply) => {
    return reply.code(200).send({ message: 'Successfully signed out' });
  });
};

export default authRoutes;
