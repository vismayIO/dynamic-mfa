import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { AppConfig } from "../config.js";
import type {
  ListModulesOptions,
  ModuleRegistryItem,
  ModuleStatus,
  RegisterModuleInput,
} from "../types/module.js";

const PK_PREFIX = "TENANT";
const SK_PREFIX = "MODULE";

interface ModuleRecord {
  pk: string;
  sk: string;
  componentId: string;
  displayName: string;
  remoteEntryUrl: string;
  remoteScope: string;
  exposedModule: `./${string}`;
  defaultLayoutSize: {
    width: number;
    height: number;
  };
  status: ModuleStatus;
  version: string;
  tenantId: string;
  env: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModuleRepository {
  ensureTableExists: () => Promise<void>;
  registerModule: (input: RegisterModuleInput) => Promise<ModuleRegistryItem>;
  listModules: (input: ListModulesOptions) => Promise<ModuleRegistryItem[]>;
  setModuleStatus: (params: {
    tenantId: string;
    env: string;
    componentId: string;
    status: ModuleStatus;
  }) => Promise<ModuleRegistryItem | null>;
}

function createPk(tenantId: string, env: string): string {
  return `${PK_PREFIX}#${tenantId}#ENV#${env}`;
}

function createSk(componentId: string): string {
  return `${SK_PREFIX}#${componentId}`;
}

function mapRecordToItem(record: ModuleRecord): ModuleRegistryItem {
  return {
    id: record.componentId,
    displayName: record.displayName,
    remoteEntryUrl: record.remoteEntryUrl,
    remoteScope: record.remoteScope,
    exposedModule: record.exposedModule,
    defaultLayoutSize: record.defaultLayoutSize,
    status: record.status,
    version: record.version,
    tenantId: record.tenantId,
    env: record.env,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function waitForTableActive(
  client: DynamoDBClient,
  tableName: string,
  maxAttempts = 20,
): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const description = await client.send(
      new DescribeTableCommand({
        TableName: tableName,
      }),
    );

    if (description.Table?.TableStatus === "ACTIVE") {
      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
  }

  throw new Error(
    `Timed out waiting for DynamoDB table "${tableName}" to become ACTIVE.`,
  );
}

function isTableNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "ResourceNotFoundException" ||
    error.message.includes("Requested resource not found")
  );
}

export function createModuleRepository(config: AppConfig): ModuleRepository {
  const dynamoClient = new DynamoDBClient({
    region: config.awsRegion,
    endpoint: config.dynamoEndpoint,
  });
  const documentClient = DynamoDBDocumentClient.from(dynamoClient, {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  });

  const tableName = config.dynamoTableName;

  const ensureTableExists = async () => {
    try {
      await dynamoClient.send(
        new DescribeTableCommand({
          TableName: tableName,
        }),
      );
      return;
    } catch (error) {
      if (!isTableNotFoundError(error)) {
        throw error;
      }
    }

    await dynamoClient.send(
      new CreateTableCommand({
        TableName: tableName,
        BillingMode: "PAY_PER_REQUEST",
        KeySchema: [
          {
            AttributeName: "pk",
            KeyType: "HASH",
          },
          {
            AttributeName: "sk",
            KeyType: "RANGE",
          },
        ],
        AttributeDefinitions: [
          {
            AttributeName: "pk",
            AttributeType: "S",
          },
          {
            AttributeName: "sk",
            AttributeType: "S",
          },
        ],
      }),
    );

    await waitForTableActive(dynamoClient, tableName);
  };

  const registerModule = async (input: RegisterModuleInput) => {
    const now = new Date().toISOString();
    const pk = createPk(input.tenantId, input.env);
    const sk = createSk(input.componentId);

    const updated = await documentClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { pk, sk },
        UpdateExpression:
          "SET componentId = :componentId, displayName = :displayName, remoteEntryUrl = :remoteEntryUrl, remoteScope = :remoteScope, exposedModule = :exposedModule, defaultLayoutSize = :defaultLayoutSize, #status = :status, version = :version, tenantId = :tenantId, env = :env, updatedAt = :updatedAt, createdAt = if_not_exists(createdAt, :createdAt)",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":componentId": input.componentId,
          ":displayName": input.displayName,
          ":remoteEntryUrl": input.remoteEntryUrl,
          ":remoteScope": input.remoteScope,
          ":exposedModule": input.exposedModule,
          ":defaultLayoutSize": input.defaultLayoutSize,
          ":status": input.status,
          ":version": input.version,
          ":tenantId": input.tenantId,
          ":env": input.env,
          ":updatedAt": now,
          ":createdAt": now,
        },
        ReturnValues: "ALL_NEW",
      }),
    );

    const item = updated.Attributes as ModuleRecord | undefined;
    if (!item) {
      throw new Error("Failed to persist module.");
    }

    return mapRecordToItem(item);
  };

  const listModules = async ({ tenantId, env, status }: ListModulesOptions) => {
    const response = await documentClient.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: {
          ":pk": createPk(tenantId, env),
        },
        ScanIndexForward: true,
      }),
    );

    const records = (response.Items ?? []) as ModuleRecord[];
    const filtered = status
      ? records.filter((record) => record.status === status)
      : records;

    return filtered.map(mapRecordToItem);
  };

  const setModuleStatus = async ({
    tenantId,
    env,
    componentId,
    status,
  }: {
    tenantId: string;
    env: string;
    componentId: string;
    status: ModuleStatus;
  }) => {
    const response = await documentClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          pk: createPk(tenantId, env),
          sk: createSk(componentId),
        },
        UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": status,
          ":updatedAt": new Date().toISOString(),
        },
        ConditionExpression: "attribute_exists(pk) AND attribute_exists(sk)",
        ReturnValues: "ALL_NEW",
      }),
    );

    const item = response.Attributes as ModuleRecord | undefined;
    return item ? mapRecordToItem(item) : null;
  };

  return {
    ensureTableExists,
    registerModule,
    listModules,
    setModuleStatus,
  };
}
