export interface DefaultLayoutSize {
  width: number;
  height: number;
}

export interface RemoteComponentRegistryItem {
  id: string;
  displayName: string;
  remoteEntryUrl: string;
  remoteScope: string;
  exposedModule: `./${string}`;
  defaultLayoutSize: DefaultLayoutSize;
}

const defaultRemoteWidgetEntryUrl =
  typeof __REMOTE_WIDGET_ENTRY_URL__ === "string" &&
  __REMOTE_WIDGET_ENTRY_URL__.trim().length > 0
    ? __REMOTE_WIDGET_ENTRY_URL__
    : "/remotes/remote-widget/remoteEntry.js";

const defaultRemoteWidgetScope =
  typeof __REMOTE_WIDGET_SCOPE__ === "string" && __REMOTE_WIDGET_SCOPE__.trim().length > 0
    ? __REMOTE_WIDGET_SCOPE__
    : "remoteWidget";

export const staticComponentRegistry: RemoteComponentRegistryItem[] = [
  {
    id: "mfa-register-widget",
    displayName: "MFA Register Widget",
    remoteEntryUrl: defaultRemoteWidgetEntryUrl,
    remoteScope: defaultRemoteWidgetScope,
    exposedModule: "./Widget",
    defaultLayoutSize: {
      width: 6,
      height: 4,
    },
  },
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readStringField(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return null;
}

function readSizeField(record: Record<string, unknown>): DefaultLayoutSize | null {
  const candidate = record.defaultLayoutSize;
  if (!isObject(candidate)) {
    return null;
  }

  const width = candidate.width;
  const height = candidate.height;
  if (typeof width !== "number" || typeof height !== "number") {
    return null;
  }

  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }

  return {
    width,
    height,
  };
}

export function normalizeRegistryItem(record: unknown): RemoteComponentRegistryItem | null {
  if (!isObject(record)) {
    return null;
  }

  const id = readStringField(record, ["id", "componentId"]);
  const displayName = readStringField(record, ["displayName", "name"]);
  const remoteEntryUrl = readStringField(record, ["remoteEntryUrl", "entryUrl"]);
  const remoteScope = readStringField(record, ["remoteScope", "scope"]);
  const exposedModule = readStringField(record, ["exposedModule", "module"]);
  const defaultLayoutSize = readSizeField(record);

  if (!id || !displayName || !remoteEntryUrl || !remoteScope || !exposedModule) {
    return null;
  }

  if (!defaultLayoutSize) {
    return null;
  }

  if (!exposedModule.startsWith("./")) {
    return null;
  }

  return {
    id,
    displayName,
    remoteEntryUrl,
    remoteScope,
    exposedModule: exposedModule as `./${string}`,
    defaultLayoutSize,
  };
}
