import fastify, { type FastifyInstance } from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyHelmet from "@fastify/helmet";
import { type TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
// import fastifyHttpProxy from "@fastify/http-proxy";

import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

import configEnv from "./config/app-env.js";
import appRoutes from "./routes/index.js";
import { connectDB } from "./config/db.js";
import { COOKIE_NAME } from "./constants/auth.constant.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      email?: string;
      apiKey?: string;
      apiSecret?: string;
      useTestnet: boolean;
    };
  }
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({ logger: true }).withTypeProvider<TypeBoxTypeProvider>();

  await app.register(configEnv);

  await app.register(fastifyHelmet, { contentSecurityPolicy: false });
  await app.register(fastifyRateLimit, { global: false });

  await app.register(fastifyCors, {
    origin: app.config.CLIENT_ORIGIN,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  await app.register(fastifyCookie, {
    secret: app.config.COOKIE_SECRET,
    hook: "onRequest",
    parseOptions: {},
  });

  await app.register(fastifyJwt, {
    secret: app.config.JWT_SECRET,
    cookie: {
      cookieName: COOKIE_NAME,
      signed: false,
    },
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

  await app.register(fastifySwaggerUi, { routePrefix: "/docs" });

  app.get("/swagger.json", async () => app.swagger());

  // await app.register(fastifyHttpProxy, {
  //   upstream: "https://fapi.binance.com",
  //   prefix: "/fapi",
  //   rewritePrefix: "/fapi",
  // });

  // await app.register(fastifyHttpProxy, {
  //   upstream: "https://demo-fapi.binance.com",
  //   prefix: "/demo-fapi",
  //   rewritePrefix: "",
  // });

  // await app.register(fastifyHttpProxy, {
  //   upstream: "wss://fstream.binance.com",
  //   prefix: "/fstream-proxy",
  //   rewritePrefix: "",
  //   websocket: true,
  // });
  
  // await app.register(fastifyHttpProxy, {
  //   upstream: "wss://fstream.binancefuture.com",
  //   prefix: "/fstream-testnet-proxy",
  //   rewritePrefix: "",
  //   websocket: true,
  // });

  connectDB(app.config.MONGODB_URI).catch((err) => {
    app.log.error({ err }, "[MongoDB] Failed to connect");
  });

  await app.register(appRoutes);

  return app;
}
