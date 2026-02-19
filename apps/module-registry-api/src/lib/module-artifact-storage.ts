import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
  type BucketLocationConstraint,
  type CreateBucketCommandInput,
} from "@aws-sdk/client-s3";
import type { AppConfig } from "../config.js";
import type { ExtractedModuleArchiveFile } from "./module-archive.js";

interface UploadModuleArtifactsInput {
  tenantId: string;
  env: string;
  componentId: string;
  version: string;
  archiveBuffer: Uint8Array;
  extractedFiles: ExtractedModuleArchiveFile[];
  remoteEntryPath: string;
}

export interface UploadModuleArtifactsResult {
  archiveUrl: string;
  assetsBaseUrl: string;
  remoteEntryUrl: string;
}

export interface ModuleArtifactStorage {
  ensureBucketExists: () => Promise<void>;
  uploadModuleArtifacts: (
    input: UploadModuleArtifactsInput,
  ) => Promise<UploadModuleArtifactsResult>;
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

function sanitizeKeySegment(value: string): string {
  const sanitized = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized.length > 0 ? sanitized : "unknown";
}

function createObjectPrefix(config: AppConfig, input: UploadModuleArtifactsInput): string {
  const segments = [
    sanitizeKeySegment(config.s3UploadPrefix),
    sanitizeKeySegment(input.tenantId),
    sanitizeKeySegment(input.env),
    sanitizeKeySegment(input.componentId),
    sanitizeKeySegment(input.version),
  ];

  return segments.join("/");
}

function joinPublicUrl(base: string, value: string): string {
  const normalizedBase = base.replace(/\/+$/, "");
  return `${normalizedBase}/${trimSlashes(value)}`;
}

function isBucketNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const maybeCode = (error as Error & { code?: string }).code;
  return (
    error.name === "NotFound" ||
    error.name === "NoSuchBucket" ||
    maybeCode === "NotFound" ||
    maybeCode === "NoSuchBucket"
  );
}

function createPublicReadPolicy(bucketName: string): string {
  return JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "AllowPublicRead",
        Effect: "Allow",
        Principal: "*",
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${bucketName}/*`],
      },
    ],
  });
}

export function createModuleArtifactStorage(config: AppConfig): ModuleArtifactStorage {
  const s3Client = new S3Client({
    region: config.s3Region,
    endpoint: config.s3Endpoint,
    forcePathStyle: config.s3ForcePathStyle,
    credentials: {
      accessKeyId: config.s3AccessKeyId,
      secretAccessKey: config.s3SecretAccessKey,
    },
  });

  const ensureBucketExists = async () => {
    let bucketExists = true;

    try {
      await s3Client.send(
        new HeadBucketCommand({
          Bucket: config.s3BucketName,
        }),
      );
    } catch (error) {
      if (!isBucketNotFoundError(error)) {
        throw error;
      }

      bucketExists = false;
    }

    if (!bucketExists) {
      const createInput: CreateBucketCommandInput = {
        Bucket: config.s3BucketName,
      };

      if (config.s3Region !== "us-east-1") {
        createInput.CreateBucketConfiguration = {
          LocationConstraint: config.s3Region as BucketLocationConstraint,
        };
      }

      await s3Client.send(new CreateBucketCommand(createInput));
    }

    if (config.s3EnablePublicReadAccess) {
      await s3Client.send(
        new PutBucketPolicyCommand({
          Bucket: config.s3BucketName,
          Policy: createPublicReadPolicy(config.s3BucketName),
        }),
      );
    }
  };

  const uploadModuleArtifacts = async (input: UploadModuleArtifactsInput) => {
    const prefix = createObjectPrefix(config, input);
    const archiveKey = `${prefix}/archive.zip`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: config.s3BucketName,
        Key: archiveKey,
        Body: input.archiveBuffer,
        ContentType: "application/zip",
      }),
    );

    await Promise.all(
      input.extractedFiles.map((file) =>
        s3Client.send(
          new PutObjectCommand({
            Bucket: config.s3BucketName,
            Key: `${prefix}/${file.path}`,
            Body: file.data,
            ContentType: file.contentType,
            CacheControl: "public, max-age=31536000, immutable",
          }),
        ),
      ),
    );

    const assetsBaseUrl = joinPublicUrl(config.s3PublicBaseUrl, prefix);

    return {
      archiveUrl: joinPublicUrl(config.s3PublicBaseUrl, archiveKey),
      assetsBaseUrl,
      remoteEntryUrl: joinPublicUrl(assetsBaseUrl, input.remoteEntryPath),
    };
  };

  return {
    ensureBucketExists,
    uploadModuleArtifacts,
  };
}
