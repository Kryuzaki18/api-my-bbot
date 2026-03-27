import fp from 'fastify-plugin';
import fastifyEnv from '@fastify/env';
import { Type, type Static } from '@sinclair/typebox';
import { type FastifyInstance } from 'fastify';

// Define the required environment variables using TypeBox for strict schema validation.
const schema = Type.Object({
  PORT: Type.Number({ default: 3000 }),
  JWT_SECRET: Type.String({ minLength: 16 }),
});

type EnvConfig = Static<typeof schema>;

// Extend fastify instance interface so we can access `fastify.config` safely
declare module 'fastify' {
  interface FastifyInstance {
    config: EnvConfig;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  await fastify.register(fastifyEnv, {
    confKey: 'config',
    schema: schema,
    dotenv: true,
  });
});
