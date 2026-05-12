import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";

import { ROUTES } from "../config/app-routes.js";
import { binanceService } from "../services/binance.singleton.js";
import { OrderSide, OrderType, WorkingType } from "../models/order.model.js";
import { authHook } from "../hooks/auth.hook.js";
import { sendError } from "../utils/reply.util.js";
import { BearerAuth, StandardErrors } from "../schemas/shared.schema.js";

const OpenOrdersSchema = {
  description: "Fetches open orders securely on Binance futures.",
  tags: ["Orders"],
  security: BearerAuth,
  querystring: Type.Object({
    symbol: Type.Optional(Type.String({ minLength: 1, examples: ["BTCUSDT"] })),
  }),
  response: { 200: Type.Any(), ...StandardErrors },
};

const PlaceOrderSchema = {
  description:
    "Places a secure buy/sell Futures Trade against the Binance API on behalf of the authenticated user.",
  tags: ["Orders"],
  security: BearerAuth,
  body: Type.Object({
    symbol: Type.String({ minLength: 1, examples: ["BTCUSDT"] }),
    side: Type.Enum(OrderSide),
    type: Type.Enum(OrderType),
    quantity: Type.Number({ minimum: 0 }),
    price: Type.Optional(Type.Number()),
    leverage: Type.Optional(Type.Number({ minimum: 1, maximum: 125 })),
  }),
  response: { 200: Type.Any(), ...StandardErrors },
};

const TakeProfitSchema = {
  description:
    "Places a secure Take Profit target order on Binance futures. Provide either quantity or set closePosition to true.",
  tags: ["Orders"],
  security: BearerAuth,
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
  response: { 200: Type.Any(), ...StandardErrors },
};

const StopLossSchema = {
  description:
    "Places a secure Stop Loss target order on Binance futures. Provide either quantity or set closePosition to true.",
  tags: ["Orders"],
  security: BearerAuth,
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
  response: { 200: Type.Any(), ...StandardErrors },
};

const ClosePositionSchema = {
  description: "Closes an open position at market price.",
  tags: ["Orders"],
  security: BearerAuth,
  body: Type.Object({
    symbol: Type.String({ minLength: 1, examples: ["BTCUSDT"] }),
    side: Type.Enum(OrderSide),
  }),
  response: { 200: Type.Any(), ...StandardErrors },
};

const CancelTpSlSchema = {
  description: "Cancels current TP/SL.",
  tags: ["Orders"],
  security: BearerAuth,
  body: Type.Object({
    algoId: Type.Number({ minimum: 1 }),
  }),
  response: { 200: Type.Any(), ...StandardErrors },
};

const CancelOrderSchema = {
  description: "Cancels a pending/working order.",
  tags: ["Orders"],
  security: BearerAuth,
  body: Type.Object({
    symbol: Type.String({ minLength: 1, examples: ["BTCUSDT"] }),
    orderId: Type.Optional(Type.Union([Type.Number(), Type.String()])),
    origClientOrderId: Type.Optional(Type.String()),
  }),
  response: { 200: Type.Any(), ...StandardErrors },
};

const ordersRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook("onRequest", authHook);

  fastify.get(ROUTES.FUTURES_POSITIONS, { schema: OpenOrdersSchema }, async (request, reply) => {
    try {
      const { apiKey, apiSecret, useTestnet } = request.user;
      return reply.code(200).send(
        await binanceService.getFuturesPositions(apiKey!, apiSecret!, useTestnet),
      );
    } catch (error) {
      return sendError(reply, error);
    }
  });

  fastify.get(ROUTES.FUTURES_OPEN_ORDERS, { schema: OpenOrdersSchema }, async (request, reply) => {
    try {
      const { apiKey, apiSecret, useTestnet } = request.user;
      return reply.code(200).send(
        await binanceService.getOpenOrders(apiKey!, apiSecret!, useTestnet),
      );
    } catch (error) {
      return sendError(reply, error);
    }
  });

  fastify.get(ROUTES.FUTURES_PENDING_TP_SL, { schema: OpenOrdersSchema }, async (request, reply) => {
    try {
      const { apiKey, apiSecret, useTestnet } = request.user;
      return reply.code(200).send(
        await binanceService.getPendingTpSl(apiKey!, apiSecret!, useTestnet),
      );
    } catch (error) {
      return sendError(reply, error);
    }
  });

  fastify.post(ROUTES.FUTURES_ORDER, { schema: PlaceOrderSchema }, async (request, reply) => {
    try {
      const { apiKey, apiSecret, useTestnet } = request.user;
      const body = request.body as any;
      body.useTestnet = useTestnet;
      body.symbol = body.symbol?.toUpperCase();
      return reply.code(200).send(await binanceService.placeOrder(apiKey!, apiSecret!, body));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  fastify.post(ROUTES.FUTURES_TAKE_PROFIT, { schema: TakeProfitSchema }, async (request, reply) => {
    try {
      const { apiKey, apiSecret, useTestnet } = request.user;
      const body = request.body as any;
      body.useTestnet = useTestnet;
      body.symbol = body.symbol?.toUpperCase();
      return reply.code(200).send(
        await binanceService.placeTakeProfitOrder(apiKey!, apiSecret!, body),
      );
    } catch (error) {
      return sendError(reply, error);
    }
  });

  fastify.post(ROUTES.FUTURES_STOP_LOSS, { schema: StopLossSchema }, async (request, reply) => {
    try {
      const { apiKey, apiSecret, useTestnet } = request.user;
      const body = request.body as any;
      body.useTestnet = useTestnet;
      body.symbol = body.symbol?.toUpperCase();
      return reply.code(200).send(
        await binanceService.placeStopLossOrder(apiKey!, apiSecret!, body),
      );
    } catch (error) {
      return sendError(reply, error);
    }
  });

  fastify.post(ROUTES.FUTURES_CLOSE_POSITION, { schema: ClosePositionSchema }, async (request, reply) => {
    try {
      const { apiKey, apiSecret, useTestnet } = request.user;
      const body = request.body as any;
      body.useTestnet = useTestnet;
      body.symbol = body.symbol?.toUpperCase();
      return reply.code(200).send(
        await binanceService.closePosition(apiKey!, apiSecret!, body),
      );
    } catch (error) {
      return sendError(reply, error);
    }
  });

  fastify.post(ROUTES.FUTURES_CANCEL_TPSL, { schema: CancelTpSlSchema }, async (request, reply) => {
    try {
      const { apiKey, apiSecret, useTestnet } = request.user;
      const body = request.body as any;
      body.useTestnet = useTestnet;
      return reply.code(200).send(
        await binanceService.cancelTpSl(apiKey!, apiSecret!, body),
      );
    } catch (error) {
      return sendError(reply, error);
    }
  });

  fastify.post(ROUTES.FUTURES_CANCEL_ORDER, { schema: CancelOrderSchema }, async (request, reply) => {
    try {
      const { apiKey, apiSecret, useTestnet } = request.user;
      const body = request.body as any;
      body.useTestnet = useTestnet;
      body.symbol = body.symbol?.toUpperCase();
      return reply.code(200).send(
        await binanceService.cancelOrder(apiKey!, apiSecret!, body),
      );
    } catch (error) {
      return sendError(reply, error);
    }
  });
};

export default ordersRoutes;
