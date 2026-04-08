import fastify, { type FastifyInstance } from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import { type TypeBoxTypeProvider } from "@fastify/type-provider-typebox";

import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

import configEnv from "./config/app-env.js";
import appRoutes from "./routes/index.js";
import { connectDB } from "./config/db.js";
import { COOKIE_NAME } from "./constants/auth.constants.js";

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

  app.after(async () => {
    app.register(fastifyCors, {
      origin: app.config.CLIENT_ORIGIN,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true, // Required for cookies to be sent cross-origin
    });

    app.register(fastifyCookie, {
      secret: app.config.COOKIE_SECRET,
      hook: "onRequest",
      parseOptions: {},
    });

    app.register(fastifyJwt, {
      secret: app.config.JWT_SECRET,
      cookie: {
        cookieName: COOKIE_NAME,
        signed: false,
      },
    });

    // Swagger docs
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

    app.get("/swagger.json", async (request, reply) => {
      return app.swagger();
    });

    connectDB(app.config.MONGODB_URI).catch((err) => {
      app.log.error({ err }, "[MongoDB] Failed to connect");
    });

    app.register(appRoutes);
  });

  return app;
}
