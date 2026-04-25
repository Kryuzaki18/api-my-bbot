import { type FastifyReply } from "fastify";

export function sendError(reply: FastifyReply, error: any): FastifyReply {
  if (error?.status) {
    return reply.code(error.status).send({
      error: error.message,
      details: error.details,
    });
  }

  return reply.code(500).send({
    error: "Internal Server Error",
    details: error?.message,
  });
}
