import type { ComponentType } from "react";
import type {
  FederatedRemoteModule,
  RemoteComponentProps,
} from "@workspace/ui-sdk";
import type { RemoteComponentRegistryItem } from "../registry/component-registry";

interface FederationContainer {
  init: (shareScope: unknown) => Promise<void>;
  get: (module: string) => Promise<() => unknown>;
}

type RemoteWindow = Window & Record<string, unknown>;

const remoteScriptCache = new Map<string, Promise<void>>();
const remoteContainerInitCache = new Map<string, Promise<void>>();
const remoteModuleCache = new Map<
  string,
  Promise<ComponentType<RemoteComponentProps>>
>();

function isFederationContainer(value: unknown): value is FederationContainer {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as {
    init?: unknown;
    get?: unknown;
  };

  return typeof candidate.init === "function" && typeof candidate.get === "function";
}

function loadRemoteScript(remoteEntryUrl: string): Promise<void> {
  const cached = remoteScriptCache.get(remoteEntryUrl);
  if (cached) {
    return cached;
  }

  const remoteScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-remote-entry-url="${remoteEntryUrl}"]`,
    );

    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(`Failed to load remote entry: ${remoteEntryUrl}`)),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = remoteEntryUrl;
    script.dataset.remoteEntryUrl = remoteEntryUrl;

    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => {
      reject(new Error(`Failed to load remote entry: ${remoteEntryUrl}`));
    };

    document.head.appendChild(script);
  }).catch((error) => {
    remoteScriptCache.delete(remoteEntryUrl);
    throw error;
  });

  remoteScriptCache.set(remoteEntryUrl, remoteScriptPromise);
  return remoteScriptPromise;
}

async function getRemoteContainer(
  remoteScope: string,
  remoteEntryUrl: string,
): Promise<FederationContainer> {
  await loadRemoteScript(remoteEntryUrl);

  const containerCandidate = (window as unknown as RemoteWindow)[remoteScope];

  if (!isFederationContainer(containerCandidate)) {
    throw new Error(
      `Remote scope "${remoteScope}" was not found after loading "${remoteEntryUrl}".`,
    );
  }

  return containerCandidate;
}

function isAlreadyInitializedError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes("already initialized")
  );
}

async function initializeRemoteContainer(
  container: FederationContainer,
  cacheKey: string,
): Promise<void> {
  const cached = remoteContainerInitCache.get(cacheKey);
  if (cached) {
    await cached;
    return;
  }

  const normalizedInitPromise = Promise.resolve(
    container.init(__webpack_share_scopes__.default),
  )
    .catch((error) => {
      if (!isAlreadyInitializedError(error)) {
        throw error;
      }
    });

  remoteContainerInitCache.set(cacheKey, normalizedInitPromise);
  await normalizedInitPromise;
}

export async function loadFederatedComponent(
  registryItem: RemoteComponentRegistryItem,
): Promise<ComponentType<RemoteComponentProps>> {
  const moduleCacheKey = `${registryItem.remoteScope}::${registryItem.remoteEntryUrl}::${registryItem.exposedModule}`;
  const cachedModule = remoteModuleCache.get(moduleCacheKey);
  if (cachedModule) {
    return cachedModule;
  }

  const modulePromise = (async () => {
    await __webpack_init_sharing__("default");

    const container = await getRemoteContainer(
      registryItem.remoteScope,
      registryItem.remoteEntryUrl,
    );

    const cacheKey = `${registryItem.remoteScope}::${registryItem.remoteEntryUrl}`;
    await initializeRemoteContainer(container, cacheKey);

    const moduleFactory = await container.get(registryItem.exposedModule);
    const module = moduleFactory() as FederatedRemoteModule;

    if (!module?.default) {
      throw new Error(
        `Remote module "${registryItem.exposedModule}" did not provide a default export.`,
      );
    }

    return module.default;
  })().catch((error) => {
    remoteModuleCache.delete(moduleCacheKey);
    throw error;
  });

  remoteModuleCache.set(moduleCacheKey, modulePromise);
  return modulePromise;
}
