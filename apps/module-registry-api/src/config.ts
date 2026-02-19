export interface AppConfig {
  host: string;
  port: number;
  awsRegion: string;
  dynamoTableName: string;
  dynamoEndpoint?: string;
  s3Region: string;
  s3BucketName: string;
  s3Endpoint?: string;
  s3ForcePathStyle: boolean;
  s3PublicBaseUrl: string;
  s3UploadPrefix: string;
  autoCreateS3Bucket: boolean;
  s3EnablePublicReadAccess: boolean;
  maxArchiveUploadSizeBytes: number;
  defaultTenantId: string;
  defaultEnvironment: string;
  autoCreateTable: boolean;
  allowedOrigins: string[];
  registryApiKey: string;
}

function readString(name: string, fallback: string): string {
  const value = process.env[name];
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return fallback;
}

function readNumber(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBoolean(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }

  if (value === "1" || value.toLowerCase() === "true") {
    return true;
  }

  if (value === "0" || value.toLowerCase() === "false") {
    return false;
  }

  return fallback;
}

function readList(name: string): string[] {
  const value = process.env[name];
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function buildDefaultS3PublicBaseUrl(params: {
  bucketName: string;
  endpoint?: string;
  region: string;
  forcePathStyle: boolean;
}): string {
  if (params.endpoint) {
    const baseEndpoint = trimTrailingSlash(params.endpoint);
    if (params.forcePathStyle) {
      return `${baseEndpoint}/${params.bucketName}`;
    }

    return baseEndpoint;
  }

  return `https://${params.bucketName}.s3.${params.region}.amazonaws.com`;
}

export function loadConfig(): AppConfig {
  const awsRegion = readString("AWS_REGION", "ap-south-1");
  const dynamoEndpoint = readString("DYNAMODB_ENDPOINT", "");

  const s3Endpoint = readString("S3_ENDPOINT", "");
  const s3BucketName = readString("S3_BUCKET_NAME", "module-artifacts");
  const s3Region = readString("S3_REGION", awsRegion);
  const s3ForcePathStyle = readBoolean(
    "S3_FORCE_PATH_STYLE",
    Boolean(s3Endpoint),
  );
  const s3PublicBaseUrl = trimTrailingSlash(
    readString(
      "S3_PUBLIC_BASE_URL",
      buildDefaultS3PublicBaseUrl({
        bucketName: s3BucketName,
        endpoint: s3Endpoint.length > 0 ? s3Endpoint : undefined,
        region: s3Region,
        forcePathStyle: s3ForcePathStyle,
      }),
    ),
  );

  const maxArchiveSizeMb = readNumber("MAX_ARCHIVE_UPLOAD_SIZE_MB", 20);
  const maxArchiveUploadSizeBytes =
    Math.max(1, Math.floor(maxArchiveSizeMb)) * 1024 * 1024;

  return {
    host: readString("HOST", "0.0.0.0"),
    port: readNumber("PORT", 4000),
    awsRegion,
    dynamoTableName: readString("DYNAMODB_TABLE_NAME", "module_registry"),
    dynamoEndpoint: dynamoEndpoint.length > 0 ? dynamoEndpoint : undefined,
    s3Region,
    s3BucketName,
    s3Endpoint: s3Endpoint.length > 0 ? s3Endpoint : undefined,
    s3ForcePathStyle,
    s3PublicBaseUrl,
    s3UploadPrefix: readString("S3_UPLOAD_PREFIX", "modules"),
    autoCreateS3Bucket: readBoolean("AUTO_CREATE_S3_BUCKET", true),
    s3EnablePublicReadAccess: readBoolean("S3_ENABLE_PUBLIC_READ_ACCESS", true),
    maxArchiveUploadSizeBytes,
    defaultTenantId: readString("DEFAULT_TENANT_ID", "public"),
    defaultEnvironment: readString("DEFAULT_ENVIRONMENT", "local"),
    autoCreateTable: readBoolean("AUTO_CREATE_TABLE", true),
    allowedOrigins: readList("ALLOWED_ORIGINS"),
    registryApiKey: readString("MODULE_REGISTRY_API_KEY", ""),
  };
}
