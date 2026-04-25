import { type FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import fastifyEnv from "@fastify/env";
import { Type, type Static } from "@sinclair/typebox";

const schema = Type.Object({
  PORT: Type.Number({ default: 3000 }),
  JWT_SECRET: Type.String({ minLength: 16 }),
  COOKIE_SECRET: Type.String({ minLength: 16 }),
  MONGODB_URI: Type.String({ minLength: 10 }),
  CLIENT_ORIGIN: Type.String({ default: "http://localhost:4200" }),
  GEMINI_API_KEY: Type.String({ minLength: 1 }),
});

type EnvConfig = Static<typeof schema>;

declare module "fastify" {
  interface FastifyInstance {
    config: EnvConfig;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  await fastify.register(fastifyEnv, {
    confKey: "config",
    schema: schema,
    dotenv: true,
  });
});
