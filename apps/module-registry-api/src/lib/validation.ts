import type { ModuleStatus, RegisterModuleInput } from "../types/module.js";

interface RegisterPayloadDefaults {
  tenantId: string;
  environment: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(payload: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function readStatus(payload: Record<string, unknown>): ModuleStatus {
  const value = readString(payload, ["status"]);
  if (value === "active" || value === "disabled" || value === "draft") {
    return value;
  }

  return "active";
}

function readLayoutSize(payload: Record<string, unknown>) {
  const candidate = payload.defaultLayoutSize;
  if (!isObject(candidate)) {
    throw new Error("defaultLayoutSize must be an object.");
  }

  const width = candidate.width;
  const height = candidate.height;
  if (typeof width !== "number" || !Number.isFinite(width)) {
    throw new Error("defaultLayoutSize.width must be a number.");
  }

  if (typeof height !== "number" || !Number.isFinite(height)) {
    throw new Error("defaultLayoutSize.height must be a number.");
  }

  return {
    width,
    height,
  };
}

export function parseRegisterModulePayload(
  payload: unknown,
  defaults: RegisterPayloadDefaults,
): RegisterModuleInput {
  if (!isObject(payload)) {
    throw new Error("Request body must be a JSON object.");
  }

  const componentId = readString(payload, ["componentId", "id"]);
  const displayName = readString(payload, ["displayName", "name"]);
  const remoteEntryUrl = readString(payload, ["remoteEntryUrl", "entryUrl"]);
  const remoteScope = readString(payload, ["remoteScope", "scope"]);
  const exposedModule = readString(payload, ["exposedModule", "module"]);
  const tenantId = readString(payload, ["tenantId"]) ?? defaults.tenantId;
  const env = readString(payload, ["env", "environment"]) ?? defaults.environment;
  const version = readString(payload, ["version"]) ?? "1.0.0";

  if (!componentId) {
    throw new Error("componentId is required.");
  }

  if (!displayName) {
    throw new Error("displayName is required.");
  }

  if (!remoteEntryUrl) {
    throw new Error("remoteEntryUrl is required.");
  }

  if (!remoteScope) {
    throw new Error("remoteScope is required.");
  }

  if (!exposedModule || !exposedModule.startsWith("./")) {
    throw new Error("exposedModule must start with './'.");
  }

  return {
    componentId,
    displayName,
    remoteEntryUrl,
    remoteScope,
    exposedModule: exposedModule as `./${string}`,
    defaultLayoutSize: readLayoutSize(payload),
    status: readStatus(payload),
    version,
    tenantId,
    env,
  };
}
