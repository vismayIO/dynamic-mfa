export interface AppConfig {
  host: string;
  port: number;
  awsRegion: string;
  dynamoTableName: string;
  dynamoEndpoint?: string;
  dynamoAccessKeyId: string;
  dynamoSecretAccessKey: string;
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

export function loadConfig(): AppConfig {
  const endpoint = readString("DYNAMODB_ENDPOINT", "");

  return {
    host: readString("HOST", "0.0.0.0"),
    port: readNumber("PORT", 4000),
    awsRegion: readString("AWS_REGION", "us-east-1"),
    dynamoTableName: readString("DYNAMODB_TABLE_NAME", "module_registry"),
    dynamoEndpoint: endpoint.length > 0 ? endpoint : undefined,
    dynamoAccessKeyId: readString("AWS_ACCESS_KEY_ID", "local"),
    dynamoSecretAccessKey: readString("AWS_SECRET_ACCESS_KEY", "local"),
    defaultTenantId: readString("DEFAULT_TENANT_ID", "public"),
    defaultEnvironment: readString("DEFAULT_ENVIRONMENT", "local"),
    autoCreateTable: readBoolean("AUTO_CREATE_TABLE", true),
    allowedOrigins: readList("ALLOWED_ORIGINS"),
    registryApiKey: readString("MODULE_REGISTRY_API_KEY", ""),
  };
}
