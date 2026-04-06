import fastify, { type FastifyInstance } from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import { type TypeBoxTypeProvider } from "@fastify/type-provider-typebox";

import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

import configEnv from "./config/app-env.js";
import appRoutes from "./routes/index.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      apiKey: string;
      apiSecret: string;
      useTestnet: boolean;
    };
  }
}

export function buildApp(): FastifyInstance {
  const app = fastify({
    logger: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  app.register(configEnv);

  app.register(fastifyCors, {
    origin: "*", // For development. Change App URL in Prod
    // origin: "http://localhost:4200", // For development. Change App URL in Prod
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.after(async () => {
    app.register(fastifyJwt, {
      secret: app.config.JWT_SECRET,
    });

    await app.register(fastifySwagger, {
      openapi: {
        info: {
          title: "Binance Trading Proxy",
          description:
            "A stateless proxy for executing API trades on Binance securely",
          version: "1.0.0",
        },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
            },
          },
        },
      },
    });

    await app.register(fastifySwaggerUi, {
      routePrefix: "/docs",
    });

    app.get('/swagger.json', async (request, reply) => {
      return app.swagger(); 
    });

    app.register(appRoutes);
  });

  return app;
}
