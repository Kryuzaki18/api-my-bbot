import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";

import { ROUTES } from "../config/app-routes.js";
import { binanceService } from "../services/binance.singleton.js";
import { authHook } from "../hooks/auth.hook.js";
import { sendError } from "../utils/reply.util.js";
import { BearerAuth, StandardErrors } from "../schemas/shared.schema.js";

const UsersInfoSchema = {
  description:
    "Fetches account information and balances for the authenticated user from Binance futures API.",
  tags: ["User Info"],
  security: BearerAuth,
  response: { 200: Type.Any(), ...StandardErrors },
};

const usersRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook("onRequest", authHook);

  fastify.get(ROUTES.USER_INFO, { schema: UsersInfoSchema }, async (request, reply) => {
    try {
      const { apiKey, apiSecret, useTestnet } = request.user;
      return reply.code(200).send(
        await binanceService.getAccountInformation(apiKey!, apiSecret!, useTestnet),
      );
    } catch (error) {
      return sendError(reply, error);
    }
  });
};

export default usersRoutes;
