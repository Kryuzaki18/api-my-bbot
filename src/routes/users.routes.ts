import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";

import { BinanceService } from "../services/binance.service.js";
import { ROUTES } from "../config/app-routes.js";
import User from "../schema/users.schema.js";

const UsersInfoSchema = {
  description:
    "Fetches account information and balances for the authenticated user from Binance futures API.",
  tags: ["User Info"],
  security: [{ bearerAuth: [] }],
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

const usersRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const binanceService = new BinanceService();

  fastify.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
      if (request.user?.email) {
        const userDB = await User.findOne({ email: request.user.email }).lean();
        if (!userDB) throw new Error("Invalid session user");
        
        let useTestnet = request.user.useTestnet;
        if (request.body && typeof (request.body as any).useTestnet === "boolean") {
          useTestnet = (request.body as any).useTestnet;
          request.user.useTestnet = useTestnet;
        } else if (request.query && typeof (request.query as any).useTestnet === "string") {
          useTestnet = (request.query as any).useTestnet === "true";
          request.user.useTestnet = useTestnet;
        }

        const keys = useTestnet ? userDB.binanceKeys.test : userDB.binanceKeys.prod;
        request.user.apiKey = keys.apiKey;
        request.user.apiSecret = keys.apiSecret;
      }
    } catch (err) {
      reply.send(err);
    }
  });

  fastify.get(
    ROUTES.USER_INFO,
    { schema: UsersInfoSchema },
    async (request, reply) => {
      try {
        const { apiKey, apiSecret, useTestnet } = request.user as any;

        const result = await binanceService.getAccountInformation(
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
};

export default usersRoutes;
