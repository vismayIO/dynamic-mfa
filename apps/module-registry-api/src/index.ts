import "dotenv/config";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { loadConfig } from "./config.js";
import { createModuleRepository } from "./lib/dynamo.js";
import { parseRegisterModulePayload } from "./lib/validation.js";
import type { ModuleStatus } from "./types/module.js";

const config = loadConfig();
const repository = createModuleRepository(config);

const app = Fastify({
  logger: true,
});

let dynamoReady = false;
let dynamoError: string | null = null;

const corsOrigin = config.allowedOrigins.length > 0 ? config.allowedOrigins : true;
await app.register(cors, {
  origin: corsOrigin,
});

if (config.registryApiKey.length > 0) {
  app.addHook("onRequest", async (request, reply) => {
    if (request.method === "OPTIONS" || request.url.startsWith("/health")) {
      return;
    }

    const headerValue = request.headers["x-api-key"];
    const apiKey = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (apiKey !== config.registryApiKey) {
      return reply.code(401).send({
        error: "Unauthorized",
      });
    }
  });
}

app.get("/health", async () => {
  return {
    ok: true,
    service: "module-registry-api",
    table: config.dynamoTableName,
    dynamo: {
      ready: dynamoReady,
      error: dynamoError,
      endpoint: config.dynamoEndpoint ?? "(aws-managed)",
    },
  };
});

app.get("/modules", async (request) => {
  const query = request.query as {
    tenantId?: string;
    env?: string;
    status?: string;
  };

  const tenantId = query.tenantId?.trim() || config.defaultTenantId;
  const env = query.env?.trim() || config.defaultEnvironment;
  const status =
    query.status === "active" || query.status === "disabled" || query.status === "draft"
      ? (query.status as ModuleStatus)
      : undefined;

  const items = await repository.listModules({
    tenantId,
    env,
    status,
  });

  return {
    items,
  };
});

app.post("/modules", async (request, reply) => {
  try {
    const payload = parseRegisterModulePayload(request.body, {
      tenantId: config.defaultTenantId,
      environment: config.defaultEnvironment,
    });
    const moduleRecord = await repository.registerModule(payload);
    reply.code(201);
    return moduleRecord;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid module payload.";
    reply.code(400);
    return {
      error: message,
    };
  }
});

app.patch("/modules/:componentId/status", async (request, reply) => {
  const params = request.params as {
    componentId?: string;
  };
  const query = request.query as {
    tenantId?: string;
    env?: string;
  };
  const body = request.body as {
    status?: string;
  };

  const componentId = params.componentId?.trim();
  if (!componentId) {
    reply.code(400);
    return { error: "componentId param is required." };
  }

  if (body.status !== "active" && body.status !== "disabled" && body.status !== "draft") {
    reply.code(400);
    return { error: "status must be one of active|disabled|draft." };
  }

  const tenantId = query.tenantId?.trim() || config.defaultTenantId;
  const env = query.env?.trim() || config.defaultEnvironment;

  try {
    const updated = await repository.setModuleStatus({
      tenantId,
      env,
      componentId,
      status: body.status,
    });

    if (!updated) {
      reply.code(404);
      return { error: "Module not found." };
    }

    return updated;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update module status.";
    if (message.includes("ConditionalCheckFailedException")) {
      reply.code(404);
      return { error: "Module not found." };
    }

    throw error;
  }
});

if (config.autoCreateTable) {
  void repository
    .ensureTableExists()
    .then(() => {
      dynamoReady = true;
      dynamoError = null;
      app.log.info({ table: config.dynamoTableName }, "DynamoDB table ready");
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown DynamoDB error";
      dynamoReady = false;
      dynamoError = message;
      app.log.error(
        {
          error,
          endpoint: config.dynamoEndpoint ?? "(aws-managed)",
          table: config.dynamoTableName,
        },
        "Failed to initialize DynamoDB table. API started; module routes may fail until DynamoDB is reachable.",
      );
    });
} else {
  dynamoReady = true;
}

try {
  await app.listen({
    host: config.host,
    port: config.port,
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
