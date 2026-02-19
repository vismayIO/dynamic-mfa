import "dotenv/config";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import Fastify, { type FastifyRequest } from "fastify";
import { loadConfig } from "./config.js";
import { createModuleRepository } from "./lib/dynamo.js";
import {
  extractModuleArchive,
  normalizeArchivePath,
} from "./lib/module-archive.js";
import { createModuleArtifactStorage } from "./lib/module-artifact-storage.js";
import {
  parseRegisterModulePayload,
  parseRegisterModuleUploadFields,
} from "./lib/validation.js";
import type { ModuleStatus } from "./types/module.js";

interface MultipartUploadRequestPayload {
  archiveBuffer: Uint8Array;
  archiveFilename: string;
  fields: Record<string, string>;
}

const config = loadConfig();
const repository = createModuleRepository(config);
const artifactStorage = createModuleArtifactStorage(config);

const app = Fastify({
  logger: true,
});

let dynamoReady = false;
let dynamoError: string | null = null;
let s3Ready = false;
let s3Error: string | null = null;

function isMultipartSizeError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = (error as Error & { code?: string }).code;
  return code === "FST_REQ_FILE_TOO_LARGE" || code === "FST_FILES_LIMIT";
}

function isBadUploadInputError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("required") ||
    message.includes("must") ||
    message.includes("invalid") ||
    message.includes("unexpected file field") ||
    message.includes("only one archive file") ||
    message.includes("not found in archive")
  );
}

async function parseMultipartUploadRequest(
  request: FastifyRequest,
): Promise<MultipartUploadRequestPayload> {
  if (!request.isMultipart()) {
    throw new Error("Request must be multipart/form-data.");
  }

  const fields: Record<string, string> = {};
  let archiveBuffer: Uint8Array | null = null;
  let archiveFilename = "module.zip";

  for await (const part of request.parts()) {
    if (part.type === "file") {
      if (part.fieldname !== "archive") {
        await part.toBuffer();
        throw new Error(`Unexpected file field "${part.fieldname}". Use "archive".`);
      }

      if (archiveBuffer) {
        await part.toBuffer();
        throw new Error("Only one archive file is allowed.");
      }

      archiveBuffer = await part.toBuffer();
      archiveFilename = part.filename ?? archiveFilename;
      continue;
    }

    fields[part.fieldname] =
      typeof part.value === "string" ? part.value : String(part.value);
  }

  if (!archiveBuffer) {
    throw new Error("archive file is required.");
  }

  if (!archiveFilename.toLowerCase().endsWith(".zip")) {
    throw new Error("archive file must have a .zip extension.");
  }

  return {
    archiveBuffer,
    archiveFilename,
    fields,
  };
}

const corsOrigin = config.allowedOrigins.length > 0 ? config.allowedOrigins : true;
await app.register(cors, {
  origin: corsOrigin,
});

await app.register(multipart, {
  limits: {
    files: 1,
    fileSize: config.maxArchiveUploadSizeBytes,
  },
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
    bucket: config.s3BucketName,
    dynamo: {
      ready: dynamoReady,
      error: dynamoError,
      endpoint: config.dynamoEndpoint ?? "(aws-managed)",
    },
    s3: {
      ready: s3Ready,
      error: s3Error,
      endpoint: config.s3Endpoint ?? "(aws-managed)",
      publicBaseUrl: config.s3PublicBaseUrl,
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

app.post("/modules/upload", async (request, reply) => {
  try {
    const multipartPayload = await parseMultipartUploadRequest(request);
    const parsedUploadFields = parseRegisterModuleUploadFields(multipartPayload.fields, {
      tenantId: config.defaultTenantId,
      environment: config.defaultEnvironment,
    });

    const remoteEntryPath = normalizeArchivePath(parsedUploadFields.remoteEntryPath);
    const extractedFiles = await extractModuleArchive(multipartPayload.archiveBuffer);
    const hasRemoteEntry = extractedFiles.some((file) => file.path === remoteEntryPath);

    if (!hasRemoteEntry) {
      reply.code(400);
      return {
        error: `remoteEntryPath "${remoteEntryPath}" was not found in archive.`,
      };
    }

    const uploadResult = await artifactStorage.uploadModuleArtifacts({
      archiveBuffer: multipartPayload.archiveBuffer,
      componentId: parsedUploadFields.componentId,
      tenantId: parsedUploadFields.tenantId,
      env: parsedUploadFields.env,
      version: parsedUploadFields.version,
      extractedFiles,
      remoteEntryPath,
    });

    const moduleRecord = await repository.registerModule(
      parseRegisterModulePayload(
        {
          componentId: parsedUploadFields.componentId,
          displayName: parsedUploadFields.displayName,
          remoteScope: parsedUploadFields.remoteScope,
          exposedModule: parsedUploadFields.exposedModule,
          remoteEntryUrl: uploadResult.remoteEntryUrl,
          defaultLayoutSize: parsedUploadFields.defaultLayoutSize,
          status: parsedUploadFields.status,
          version: parsedUploadFields.version,
          tenantId: parsedUploadFields.tenantId,
          env: parsedUploadFields.env,
        },
        {
          tenantId: config.defaultTenantId,
          environment: config.defaultEnvironment,
        },
      ),
    );

    reply.code(201);
    return {
      ...moduleRecord,
      artifact: {
        archiveFilename: multipartPayload.archiveFilename,
        archiveUrl: uploadResult.archiveUrl,
        assetsBaseUrl: uploadResult.assetsBaseUrl,
        remoteEntryPath,
      },
    };
  } catch (error) {
    if (isMultipartSizeError(error)) {
      reply.code(413);
      return {
        error: `Archive exceeds upload limit (${config.maxArchiveUploadSizeBytes} bytes).`,
      };
    }

    if (isBadUploadInputError(error)) {
      const message = error instanceof Error ? error.message : "Invalid module upload payload.";
      reply.code(400);
      return {
        error: message,
      };
    }

    request.log.error({ error }, "Failed to register module from upload.");
    reply.code(500);
    return {
      error: "Failed to register module from upload.",
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

if (config.autoCreateS3Bucket) {
  void artifactStorage
    .ensureBucketExists()
    .then(() => {
      s3Ready = true;
      s3Error = null;
      app.log.info({ bucket: config.s3BucketName }, "S3 bucket ready");
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown S3 error";
      s3Ready = false;
      s3Error = message;
      app.log.error(
        {
          error,
          endpoint: config.s3Endpoint ?? "(aws-managed)",
          bucket: config.s3BucketName,
        },
        "Failed to initialize S3 bucket. API started; upload route may fail until S3 is reachable.",
      );
    });
} else {
  s3Ready = true;
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
