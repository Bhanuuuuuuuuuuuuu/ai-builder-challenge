import Fastify from "fastify";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { ulid } from "ulid";
import { assetsRoutes } from "./routes/assets.js";
import { scansRoutes } from "./routes/scans.js";
import { mocksRoutes } from "./routes/mocks.js";
import { healthRoute, utilityRoutes } from "./routes/utility.js";
import { sendError } from "./errors.js";

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      formatters: {
        log: (obj) => obj,
      },
      base: undefined,
    },
    genReqId: () => ulid(),
    disableRequestLogging: true,
  });

  await app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  });

  await healthRoute(app);

  app.addHook("onResponse", async (req, reply) => {
    app.log.info({
      req_id: req.id,
      route: req.routeOptions?.url ?? req.url,
      method: req.method,
      status: reply.statusCode,
      duration_ms: reply.elapsedTime,
    });
  });

  app.setErrorHandler((err, _req, reply) => {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    app.log.error({ err: { message, stack } });
    if (reply.sent) return;
    return sendError(reply, 500, "internal_error", "Unexpected server error");
  });

  app.setNotFoundHandler((_req, reply) => {
    return sendError(reply, 404, "not_found", "Route not found");
  });

  await assetsRoutes(app);
  await scansRoutes(app);
  await mocksRoutes(app);
  await utilityRoutes(app);

  app.get("/", async (_req, reply) => {
    return reply.send({
      name: "asset-tracking-challenge",
      docs: "starter/docs/api-reference.md (in repository)",
      health: "/health",
    });
  });

  return app;
}

let vercelServer: FastifyInstance | null = null;

async function getVercelServer(): Promise<FastifyInstance> {
  if (!vercelServer) {
    vercelServer = await buildServer();
    await vercelServer.ready();
  }

  return vercelServer;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const app = await getVercelServer();
  app.server.emit("request", req, res);
}

