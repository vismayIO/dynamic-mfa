import { useEffect, useState, type ComponentType } from "react";
import type {
  RemoteComponentProps,
  RemoteComponentTheme,
} from "@workspace/ui-sdk";
import type { CanvasItem } from "../composer/canvas-state";
import type { HostRemoteEventHandler } from "../composer/remote-events";
import { loadFederatedComponent } from "../lib/load-federated-component";
import type { RemoteComponentRegistryItem } from "../registry/component-registry";

interface RemoteCanvasSlotProps {
  item: CanvasItem;
  registryItem: RemoteComponentRegistryItem;
  theme: RemoteComponentTheme;
  contextualData: Record<string, unknown>;
  onRemoteEvent: HostRemoteEventHandler;
}

export function RemoteCanvasSlot({
  item,
  registryItem,
  theme,
  contextualData,
  onRemoteEvent,
}: RemoteCanvasSlotProps) {
  const [RemoteComponent, setRemoteComponent] =
    useState<ComponentType<RemoteComponentProps> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;

    loadFederatedComponent(registryItem)
      .then((component) => {
        if (!disposed) {
          setRemoteComponent(() => component);
        }
      })
      .catch((error: unknown) => {
        if (!disposed) {
          const message = error instanceof Error ? error.message : "Unknown loader error";
          console.error("[remote-loader]", {
            registryId: registryItem.id,
            remoteEntryUrl: registryItem.remoteEntryUrl,
            remoteScope: registryItem.remoteScope,
            exposedModule: registryItem.exposedModule,
            error,
          });
          setLoadError(`Unable to load ${registryItem.displayName}: ${message}`);
        }
      });

    return () => {
      disposed = true;
    };
  }, [registryItem]);

  if (loadError) {
    return <p className="read-the-docs">{loadError}</p>;
  }

  if (!RemoteComponent) {
    return <p>Loading remote component...</p>;
  }

  return (
    <RemoteComponent
      componentId={item.instanceId}
      data={{
        ...contextualData,
      }}
      theme={theme}
      onEvent={(eventName, payload) => {
        onRemoteEvent({
          instanceId: item.instanceId,
          registryComponentId: registryItem.id,
          registryDisplayName: registryItem.displayName,
          eventName,
          payload,
          timestamp: new Date().toISOString(),
        });
      }}
    />
  );
}
