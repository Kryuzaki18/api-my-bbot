import { type FastifyReply, type FastifyRequest } from "fastify";
import User from "../schema/users.schema.js";

export async function authHook(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify();

    if (request.user?.email) {
      const userDB = await User.findOne({
        email: request.user.email,
      }).lean();

      if (!userDB) {
        return reply
          .code(401)
          .send({ error: "Unauthorized", details: "Invalid session" });
      }

      let { useTestnet } = request.user;

      if (
        request.body &&
        typeof (request.body as Record<string, unknown>).useTestnet === "boolean"
      ) {
        useTestnet = (request.body as Record<string, unknown>)
          .useTestnet as boolean;
        request.user.useTestnet = useTestnet;
      } else if (
        request.query &&
        typeof (request.query as Record<string, unknown>).useTestnet === "string"
      ) {
        useTestnet =
          (request.query as Record<string, unknown>).useTestnet === "true";
        request.user.useTestnet = useTestnet;
      }

      const keys = useTestnet
        ? userDB.binanceKeys.test
        : userDB.binanceKeys.prod;

      request.user.apiKey = keys.apiKey;
      request.user.apiSecret = keys.apiSecret;
    }
  } catch {
    return reply.code(401).send({ error: "Unauthorized" });
  }
}
