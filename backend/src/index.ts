import * as dotenv from "dotenv";
dotenv.config();

import Fastify from "fastify";
import { authRoutes } from "./routes/auth.js";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
const server = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

async function main() {
  await server.register(cors, {
    origin: "*",
  });

  await server.register(jwt, {
    secret: process.env.JWT_SECRET || "supersecretjwtkey_change_in_production",
  });



  server.get("/health", async (request, reply) => {
    return { status: "ok" };
  });

  server.register(authRoutes, { prefix: "/api/auth" });

  const port = parseInt(process.env.PORT || "3000", 10);
  const host = process.env.HOST || "0.0.0.0";

  try {
    await server.listen({ port, host });
    server.log.info(`Server listening on ${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
