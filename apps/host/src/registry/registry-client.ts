import {
  normalizeRegistryItem,
  type RemoteComponentRegistryItem,
} from "./component-registry";

function getRegistryEndpoint(): string {
  return typeof __MODULE_REGISTRY_API_URL__ === "string"
    ? __MODULE_REGISTRY_API_URL__.trim()
    : "";
}

function parseRegistryItems(payload: unknown): RemoteComponentRegistryItem[] {
  const rawItemsCandidate = Array.isArray(payload)
    ? payload
    : typeof payload === "object" && payload !== null && "items" in payload
      ? (payload.items as unknown)
      : null;

  if (!Array.isArray(rawItemsCandidate)) {
    throw new Error("Registry API response must be an array or { items: [...] }.");
  }

  const normalized = rawItemsCandidate
    .map((item) => normalizeRegistryItem(item))
    .filter((item): item is RemoteComponentRegistryItem => item !== null);

  if (rawItemsCandidate.length > 0 && normalized.length === 0) {
    throw new Error("Registry API returned modules, but none matched the expected schema.");
  }

  return normalized;
}

export async function fetchComponentRegistry(
  signal?: AbortSignal,
): Promise<RemoteComponentRegistryItem[]> {
  const endpoint = getRegistryEndpoint();

  if (!endpoint) {
    throw new Error("MODULE_REGISTRY_API_URL is not configured.");
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (__MODULE_REGISTRY_API_KEY__.trim().length > 0) {
    headers["x-api-key"] = __MODULE_REGISTRY_API_KEY__;
  }

  const response = await fetch(endpoint, {
    method: "GET",
    headers,
    signal,
  });

  if (!response.ok) {
    throw new Error(`Registry API request failed (${response.status})`);
  }

  const payload = (await response.json()) as unknown;
  return parseRegistryItems(payload);
}
