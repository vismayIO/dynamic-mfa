import {
  normalizeRegistryItem,
  staticComponentRegistry,
  type RemoteComponentRegistryItem,
} from "./component-registry";

function parseRegistryItems(payload: unknown): RemoteComponentRegistryItem[] {
  const rawItems = Array.isArray(payload)
    ? payload
    : typeof payload === "object" && payload !== null && "items" in payload
      ? (payload.items as unknown)
      : null;

  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems
    .map((item) => normalizeRegistryItem(item))
    .filter((item): item is RemoteComponentRegistryItem => item !== null);
}

export async function fetchComponentRegistry(
  signal?: AbortSignal,
): Promise<RemoteComponentRegistryItem[]> {
  const endpoint =
    typeof __MODULE_REGISTRY_API_URL__ === "string"
      ? __MODULE_REGISTRY_API_URL__.trim()
      : "";

  if (!endpoint) {
    return staticComponentRegistry;
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
  const normalized = parseRegistryItems(payload);
  if (normalized.length === 0) {
    throw new Error("Registry API returned no valid modules.");
  }

  return normalized;
}
