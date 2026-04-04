import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";

import { ROUTES } from "../config/app-routes.js";
import { BinanceService } from "../services/binance.service.js";
import { OrderSide, OrderType, WorkingType } from "../models/order.model.js";

const OpenOrdersSchema = {
  description: "Fetches open orders securely on Binance futures.",
  tags: ["Orders"],
  security: [{ bearerAuth: [] }],
  querystring: Type.Object({
    symbol: Type.Optional(Type.String({ minLength: 1, examples: ["BTCUSDT"] })),
  }),
  response: {
    200: Type.Any(),
    500: Type.Object({
      error: Type.String(),
      details: Type.Optional(Type.Any()),
    }),
  },
};

const PlaceOrderSchema = {
  description:
    "Places a secure buy/sell Futures Trade against the Binance API on behalf of the authenticated user.",
  tags: ["Orders"],
  security: [{ bearerAuth: [] }],
  body: Type.Object({
    symbol: Type.String({ minLength: 1, examples: ["BTCUSDT"] }),
    side: Type.Enum(OrderSide),
    type: Type.Enum(OrderType),
    quantity: Type.Number({ minimum: 0 }),
    price: Type.Optional(Type.Number()),
    leverage: Type.Optional(Type.Number({ minimum: 1, maximum: 125 })),
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

const TakeProfitSchema = {
  description:
    "Places a secure Take Profit target order on Binance futures. Provide either quantity or set closePosition to true.",
  tags: ["Orders"],
  security: [{ bearerAuth: [] }],
  body: Type.Object({
    symbol: Type.String({ minLength: 1, examples: ["BTCUSDT"] }),
    side: Type.Enum(OrderSide),
    triggerPrice: Type.Number({ minimum: 0 }),
    quantity: Type.Optional(Type.Number({ minimum: 0 })),
    closePosition: Type.Optional(Type.Boolean()),
    workingType: Type.Optional(Type.Enum(WorkingType)),
    reduceOnly: Type.Optional(Type.Boolean()),
    algotype: Type.Optional(Type.String()),
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

const StopLossSchema = {
  description:
    "Places a secure Stop Loss target order on Binance futures. Provide either quantity or set closePosition to true.",
  tags: ["Orders"],
  security: [{ bearerAuth: [] }],
  body: Type.Object({
    symbol: Type.String({ minLength: 1, examples: ["BTCUSDT"] }),
    side: Type.Enum(OrderSide),
    triggerPrice: Type.Number({ minimum: 0 }),
    quantity: Type.Optional(Type.Number({ minimum: 0 })),
    closePosition: Type.Optional(Type.Boolean()),
    workingType: Type.Optional(Type.Enum(WorkingType)),
    reduceOnly: Type.Optional(Type.Boolean()),
    algotype: Type.Optional(Type.String()),
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

const ClosePositionSchema = {
  description: "Closes an open position at market price.",
  tags: ["Orders"],
  security: [{ bearerAuth: [] }],
  body: Type.Object({
    symbol: Type.String({ minLength: 1, examples: ["BTCUSDT"] }),
    side: Type.Enum(OrderSide),
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

const CancelTpSlSchema = {
  description: "Cancels current TP/SL.",
  tags: ["Orders"],
  security: [{ bearerAuth: [] }],
  body: Type.Object({
    algoId: Type.Number({ minimum: 1 }),
    clientAlgoId: Type.String({ minLength: 1}),
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

const CancelOrderSchema = {
  description: "Cancels a pending/working order.",
  tags: ["Orders"],
  security: [{ bearerAuth: [] }],
  body: Type.Object({
    symbol: Type.String({ minLength: 1, examples: ["BTCUSDT"] }),
    orderId: Type.Number(),
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

const ordersRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const binanceService = new BinanceService();

  fastify.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  fastify.get(
    ROUTES.FUTURES_POSITIONS,
    { schema: OpenOrdersSchema },
    async (request, reply) => {
      try {
        const { apiKey, apiSecret, useTestnet } = request.user;
        const result = await binanceService.getFuturesPositions(
          apiKey,
          apiSecret,
          useTestnet,
        );
        return reply.code(200).send(result);
      } catch (error: any) {
        request.log.error(error);
        if (error.status)
          return reply
            .code(error.status)
            .send({ error: error.message, details: error.details });
        return reply
          .code(500)
          .send({ error: "Internal Server Error", details: error.message });
      }
    },
  );

  fastify.get(
    ROUTES.FUTURES_OPEN_ORDERS,
    { schema: OpenOrdersSchema },
    async (request, reply) => {
      try {
        const { symbol } = request.query as any;
        const { apiKey, apiSecret, useTestnet } = request.user;

        const result = await binanceService.getOpenOrders(
          apiKey,
          apiSecret,
          useTestnet,
          symbol?.toUpperCase(),
        );
        return reply.code(200).send(result);
      } catch (error: any) {
        request.log.error(error);
        if (error.status)
          return reply
            .code(error.status)
            .send({ error: error.message, details: error.details });
        return reply
          .code(500)
          .send({ error: "Internal Server Error", details: error.message });
      }
    },
  );

  fastify.get(
    ROUTES.FUTURES_PENDING_TP_SL,
    { schema: OpenOrdersSchema },
    async (request, reply) => {
      try {
        const { symbol } = request.query as any;
        const { apiKey, apiSecret, useTestnet } = request.user;

        const result = await binanceService.getPendingTpSl(
          apiKey,
          apiSecret,
          useTestnet,
          symbol?.toUpperCase(),
        );
        return reply.code(200).send(result);
      } catch (error: any) {
        request.log.error(error);
        if (error.status)
          return reply
            .code(error.status)
            .send({ error: error.message, details: error.details });
        return reply
          .code(500)
          .send({ error: "Internal Server Error", details: error.message });
      }
    },
  );

  fastify.post(
    ROUTES.FUTURES_ORDER,
    { schema: PlaceOrderSchema },
    async (request, reply) => {
      try {
        const body = request.body as any;
        const { apiKey, apiSecret, useTestnet } = request.user;
        body.useTestnet = useTestnet;
        body.symbol = body.symbol?.toUpperCase();

        const result = await binanceService.placeOrder(apiKey, apiSecret, body);
        return reply.code(200).send(result);
      } catch (error: any) {
        request.log.error(error);
        if (error.status)
          return reply
            .code(error.status)
            .send({ error: error.message, details: error.details });
        return reply
          .code(500)
          .send({ error: "Internal Server Error", details: error.message });
      }
    },
  );

  fastify.post(
    ROUTES.FUTURES_TAKE_PROFIT,
    { schema: TakeProfitSchema },
    async (request, reply) => {
      try {
        const body = request.body as any;
        const { apiKey, apiSecret, useTestnet } = request.user;
        body.useTestnet = useTestnet;
        body.symbol = body.symbol?.toUpperCase();

        const result = await binanceService.placeTakeProfitOrder(
          apiKey,
          apiSecret,
          body,
        );
        return reply.code(200).send(result);
      } catch (error: any) {
        // request.log.error(error);
        if (error.status)
          return reply
            .code(error.status)
            .send({ error: error.message, details: error.details });
        return reply
          .code(500)
          .send({ error: "Internal Server Error", details: error.message });
      }
    },
  );

  fastify.post(
    ROUTES.FUTURES_STOP_LOSS,
    { schema: StopLossSchema },
    async (request, reply) => {
      try {
        const body = request.body as any;
        const { apiKey, apiSecret, useTestnet } = request.user;
        body.useTestnet = useTestnet;
        body.symbol = body.symbol?.toUpperCase();

        const result = await binanceService.placeStopLossOrder(
          apiKey,
          apiSecret,
          body,
        );
        return reply.code(200).send(result);
      } catch (error: any) {
        // request.log.error(error);
        if (error.status)
          return reply
            .code(error.status)
            .send({ error: error.message, details: error.details });
        return reply
          .code(500)
          .send({ error: "Internal Server Error", details: error.message });
      }
    },
  );

  fastify.post(
    ROUTES.FUTURES_CLOSE_POSITION,
    { schema: ClosePositionSchema },
    async (request, reply) => {
      try {
        const body = request.body as any;
        const { apiKey, apiSecret, useTestnet } = request.user;
        body.useTestnet = useTestnet;
        body.symbol = body.symbol?.toUpperCase();

        const result = await binanceService.closePosition(
          apiKey,
          apiSecret,
          body,
        );
        return reply.code(200).send(result);
      } catch (error: any) {
        request.log.error(error);
        if (error.status)
          return reply
            .code(error.status)
            .send({ error: error.message, details: error.details });
        return reply
          .code(500)
          .send({ error: "Internal Server Error", details: error.message });
      }
    },
  );

  fastify.post(
    ROUTES.FUTURES_CANCEL_TPSL,
    { schema: CancelTpSlSchema },
    async (request, reply) => {
      try {
        const body = request.body as any;
        const { apiKey, apiSecret, useTestnet } = request.user;
        body.useTestnet = useTestnet;

        const result = await binanceService.cancelTpSl(
          apiKey,
          apiSecret,
          body,
        );
        return reply.code(200).send(result);
      } catch (error: any) {
        request.log.error(error);
        if (error.status)
          return reply
            .code(error.status)
            .send({ error: error.message, details: error.details });
        return reply
          .code(500)
          .send({ error: "Internal Server Error", details: error.message });
      }
    },
  );

  fastify.post(
    ROUTES.FUTURES_CANCEL_ORDER,
    { schema: CancelOrderSchema },
    async (request, reply) => {
      try {
        const body = request.body as any;
        const { apiKey, apiSecret, useTestnet } = request.user;
        body.useTestnet = useTestnet;
        body.symbol = body.symbol?.toUpperCase();

        const result = await binanceService.cancelOrder(
          apiKey,
          apiSecret,
          body,
        );
        return reply.code(200).send(result);
      } catch (error: any) {
        request.log.error(error);
        if (error.status)
          return reply
            .code(error.status)
            .send({ error: error.message, details: error.details });
        return reply
          .code(500)
          .send({ error: "Internal Server Error", details: error.message });
      }
    },
  );
};

export default ordersRoutes;
