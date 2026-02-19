type ModuleStatus = "active" | "disabled" | "draft";

interface ModuleUploadPayload {
  componentId: string;
  displayName: string;
  remoteScope: string;
  exposedModule: `./${string}`;
  remoteEntryPath: string;
  defaultLayoutWidth: number;
  defaultLayoutHeight: number;
  status: ModuleStatus;
  version: string;
  tenantId: string;
  env: string;
  archiveFile: File;
}

interface UploadedArtifactDetails {
  archiveFilename: string;
  archiveUrl: string;
  assetsBaseUrl: string;
  remoteEntryPath: string;
}

export interface UploadModuleResponse {
  id: string;
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
  artifact: UploadedArtifactDetails;
}

interface ApiErrorPayload {
  error?: string;
}

function deriveUploadEndpointFromRegistryUrl(): string {
  if (typeof __MODULE_REGISTRY_API_URL__ !== "string") {
    return "";
  }

  const registryUrl = __MODULE_REGISTRY_API_URL__.trim();
  if (!registryUrl) {
    return "";
  }

  try {
    const parsed = new URL(registryUrl);
    parsed.pathname = parsed.pathname.replace(/\/?modules\/?$/, "/modules/upload");
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function getUploadEndpoint(): string {
  if (
    typeof __MODULE_REGISTRY_UPLOAD_API_URL__ === "string" &&
    __MODULE_REGISTRY_UPLOAD_API_URL__.trim().length > 0
  ) {
    return __MODULE_REGISTRY_UPLOAD_API_URL__.trim();
  }

  const derivedEndpoint = deriveUploadEndpointFromRegistryUrl();
  if (derivedEndpoint.length > 0) {
    return derivedEndpoint;
  }

  throw new Error("MODULE_REGISTRY_UPLOAD_API_URL is not configured.");
}

export async function uploadCustomModule(
  payload: ModuleUploadPayload,
): Promise<UploadModuleResponse> {
  const endpoint = getUploadEndpoint();

  const formData = new FormData();
  formData.set("componentId", payload.componentId);
  formData.set("displayName", payload.displayName);
  formData.set("remoteScope", payload.remoteScope);
  formData.set("exposedModule", payload.exposedModule);
  formData.set("remoteEntryPath", payload.remoteEntryPath);
  formData.set("defaultLayoutWidth", String(payload.defaultLayoutWidth));
  formData.set("defaultLayoutHeight", String(payload.defaultLayoutHeight));
  formData.set("status", payload.status);
  formData.set("version", payload.version);
  formData.set("tenantId", payload.tenantId);
  formData.set("env", payload.env);
  formData.set("archive", payload.archiveFile, payload.archiveFile.name);

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (__MODULE_REGISTRY_API_KEY__.trim().length > 0) {
    headers["x-api-key"] = __MODULE_REGISTRY_API_KEY__;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: formData,
  });

  const rawPayload = (await response.json()) as unknown;

  if (!response.ok) {
    const errorMessage =
      typeof rawPayload === "object" && rawPayload !== null && "error" in rawPayload
        ? (rawPayload as ApiErrorPayload).error
        : undefined;
    throw new Error(errorMessage ?? `Upload failed (${response.status}).`);
  }

  return rawPayload as UploadModuleResponse;
}
