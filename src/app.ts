import fastify, { type FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { type TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import configEnv from './plugins/env.js';
import appRoutes from './routes/index.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { 
      apiKey: string; 
      apiSecret: string;
      useTestnet: boolean;
    }
  }
}

export function buildApp(): FastifyInstance {
  // We specify the generic TypeProvider to give TypeScript full validation powers globally
  const app = fastify({
    logger: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  // Use the fastify plugin to safely inject `fastify.config` inside the app context correctly
  app.register(configEnv);

  app.register(fastifyCors, {
    origin: '*', // For development. Change to your Angular App URL in Prod
  });

  // The 'after' ensures config is loaded before we attempt to mount routes and JWT
  app.after(async () => {
    app.register(fastifyJwt, {
      secret: app.config.JWT_SECRET,
    });

    // Swagger enables OpenAPI schema generation from our TypeBox variables
    await app.register(fastifySwagger, {
      openapi: {
        info: {
          title: 'Binance Trading Proxy',
          description: 'A stateless proxy for executing Binance Futures trades securely',
          version: '1.0.0'
        },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            }
          }
        }
      }
    });

    // Swagger UI exposes a local /docs endpoint to test the API graphically
    await app.register(fastifySwaggerUi, {
      routePrefix: '/docs',
    });

    app.register(appRoutes);
  });

  return app;
}
