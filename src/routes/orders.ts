import { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { BinanceService } from '../services/binance.js';
import { ROUTES } from '../config/constants.js';
import { OrderSide, OrderType } from '../models/order.model.js';

// Fully typed and validated schema for request payload 
const PlaceOrderSchema = {
  description: 'Places a secure buy/sell Futures Trade against the Binance API on behalf of the authenticated user.',
  tags: ['Orders'],
  security: [{ bearerAuth: [] }],
  body: Type.Object({
    symbol: Type.String({ minLength: 1, examples: ['BTCUSDT'] }),
    side: Type.Enum(OrderSide),
    type: Type.Enum(OrderType),
    quantity: Type.Number({ minimum: 0.001 }),
    price: Type.Optional(Type.Number()),
  }),
  response: {
    200: Type.Any(),
    400: Type.Object({
      error: Type.String(),
      details: Type.Optional(Type.Any())
    }),
    500: Type.Object({
      error: Type.String(),
      details: Type.Optional(Type.Any())
    })
  }
};

const TakeProfitSchema = {
  description: 'Places a secure Take Profit target order on Binance futures. Ensure quantity or closePosition is set.',
  tags: ['Orders'],
  security: [{ bearerAuth: [] }],
  body: Type.Object({
    symbol: Type.String({ minLength: 1, examples: ['BTCUSDT'] }),
    side: Type.Enum(OrderSide),
    stopPrice: Type.Number({ minimum: 0.001 }),
    quantity: Type.Optional(Type.Number({ minimum: 0.001 })),
    closePosition: Type.Optional(Type.Boolean())
  }),
  response: {
    200: Type.Any(),
    400: Type.Object({
      error: Type.String(),
      details: Type.Optional(Type.Any())
    }),
    500: Type.Object({
      error: Type.String(),
      details: Type.Optional(Type.Any())
    })
  }
};

const CancelOrderSchema = {
  description: 'Cancels a pending/working order securely on Binance futures.',
  tags: ['Orders'],
  security: [{ bearerAuth: [] }],
  body: Type.Object({
    symbol: Type.String({ minLength: 1, examples: ['BTCUSDT'] }),
    orderId: Type.Number(),
  }),
  response: {
    200: Type.Any(),
    400: Type.Object({
      error: Type.String(),
      details: Type.Optional(Type.Any())
    }),
    500: Type.Object({
      error: Type.String(),
      details: Type.Optional(Type.Any())
    })
  }
};

const ordersRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const binanceService = new BinanceService();

  // Reject strictly any request missing a valid session token
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  // Endpoint to handle the regular order creation
  fastify.post(ROUTES.FUTURES_ORDER, { schema: PlaceOrderSchema }, async (request, reply) => {
    try {
      const body = request.body as any;
      const { apiKey, apiSecret, useTestnet } = request.user;
      body.useTestnet = useTestnet;

      const result = await binanceService.placeOrder(apiKey, apiSecret, body);
      return reply.code(200).send(result);
    } catch (error: any) {
      request.log.error(error);
      if (error.status) return reply.code(error.status).send({ error: error.message, details: error.details });
      return reply.code(500).send({ error: 'Internal Server Error', details: error.message });
    }
  });

  // Endpoint to handle take profit targets
  fastify.post(ROUTES.FUTURES_TAKE_PROFIT, { schema: TakeProfitSchema }, async (request, reply) => {
    try {
      const body = request.body as any;
      const { apiKey, apiSecret, useTestnet } = request.user;
      body.useTestnet = useTestnet;

      const result = await binanceService.placeTakeProfitOrder(apiKey, apiSecret, body);
      return reply.code(200).send(result);
    } catch (error: any) {
      request.log.error(error);
      if (error.status) return reply.code(error.status).send({ error: error.message, details: error.details });
      return reply.code(500).send({ error: 'Internal Server Error', details: error.message });
    }
  });

  // Endpoint to handle cancelling an active order
  fastify.post(ROUTES.FUTURES_CANCEL_ORDER, { schema: CancelOrderSchema }, async (request, reply) => {
    try {
      const body = request.body as any;
      const { apiKey, apiSecret, useTestnet } = request.user;
      body.useTestnet = useTestnet;

      const result = await binanceService.cancelOrder(apiKey, apiSecret, body);
      return reply.code(200).send(result);
    } catch (error: any) {
      request.log.error(error);
      if (error.status) return reply.code(error.status).send({ error: error.message, details: error.details });
      return reply.code(500).send({ error: 'Internal Server Error', details: error.message });
    }
  });
};

export default ordersRoutes;
