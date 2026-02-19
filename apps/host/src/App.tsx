import {
  DndContext,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { RemoteComponentTheme } from "@workspace/ui-sdk";
import type { CanvasState } from "./composer/canvas-state";
import { loadCanvasState, saveCanvasState } from "./composer/layout-storage";
import type { HostRemoteEvent } from "./composer/remote-events";
import { RemoteCanvasSlot } from "./components/remote-canvas-slot";
import {
  componentRegistry,
  type RemoteComponentRegistryItem,
} from "./registry/component-registry";

const COMPOSER_CANVAS_DROPZONE_ID = "composer-canvas";

const initialCanvasState: CanvasState = {
  version: 1,
  items: [],
};

function createCanvasItemId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `canvas-item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function SidebarComponentCard({ item }: { item: RemoteComponentRegistryItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `registry:${item.id}`,
    data: {
      registryComponentId: item.id,
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <button
      ref={setNodeRef}
      type="button"
      className="composer-sidebar-item"
      style={{
        ...style,
        opacity: isDragging ? 0.5 : 1,
      }}
      {...listeners}
      {...attributes}
    >
      <span className="composer-sidebar-item-title">{item.displayName}</span>
      <span className="composer-sidebar-item-meta">
        {item.defaultLayoutSize.width}x{item.defaultLayoutSize.height}
      </span>
    </button>
  );
}

function App() {
  const [canvasState, setCanvasState] = useState<CanvasState>(() =>
    loadCanvasState(initialCanvasState),
  );
  const [remoteEvents, setRemoteEvents] = useState<HostRemoteEvent[]>([]);

  const registryById = useMemo(
    () =>
      new Map<string, RemoteComponentRegistryItem>(
        componentRegistry.map((item) => [item.id, item]),
      ),
    [],
  );
  const hostTheme = useMemo<RemoteComponentTheme>(
    () => ({
      mode: "light",
      tokens: {
        accentColor: "#1570ef",
        surfaceColor: "#ffffff",
      },
    }),
    [],
  );

  const { isOver, setNodeRef } = useDroppable({
    id: COMPOSER_CANVAS_DROPZONE_ID,
  });

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || over.id !== COMPOSER_CANVAS_DROPZONE_ID) {
      return;
    }

    const registryComponentId = active.data.current?.registryComponentId;
    if (typeof registryComponentId !== "string") {
      return;
    }

    const registryItem = registryById.get(registryComponentId);
    if (!registryItem) {
      return;
    }

    setCanvasState((currentState) => ({
      ...currentState,
      items: [
        ...currentState.items,
        {
          instanceId: createCanvasItemId(),
          componentId: registryItem.id,
          size: {
            width: registryItem.defaultLayoutSize.width,
            height: registryItem.defaultLayoutSize.height,
          },
        },
      ],
    }));
  };

  const removeCanvasItem = (instanceId: string) => {
    setCanvasState((currentState) => ({
      ...currentState,
      items: currentState.items.filter((item) => item.instanceId !== instanceId),
    }));
  };

  useEffect(() => {
    saveCanvasState(canvasState);
  }, [canvasState]);

  const handleRemoteEvent = useCallback((event: HostRemoteEvent) => {
    setRemoteEvents((currentEvents) => [event, ...currentEvents].slice(0, 20));
    console.log(
      `[host remote event] ${event.registryComponentId}:${event.eventName}`,
      event.payload,
    );
  }, []);

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <main className="composer-shell">
        <aside className="composer-sidebar">
          <h1>Component Registry</h1>
          <p>Drag components into the canvas to compose UI.</p>
          <div className="composer-sidebar-list">
            {componentRegistry.map((item) => (
              <SidebarComponentCard key={item.id} item={item} />
            ))}
          </div>
        </aside>

        <section className="composer-main">
          <header className="composer-main-header">
            <h2>Canvas</h2>
            <p>
              Items: <code>{canvasState.items.length}</code>
            </p>
          </header>

          <div
            ref={setNodeRef}
            className={`composer-canvas ${isOver ? "composer-canvas--over" : ""}`}
          >
            {canvasState.items.length === 0 ? (
              <p className="composer-empty-state">
                Drop a registry component here to create a canvas slot.
              </p>
            ) : (
              <div className="composer-grid">
                {canvasState.items.map((item) => {
                  const registryItem = registryById.get(item.componentId);
                  if (!registryItem) {
                    return (
                      <article key={item.instanceId} className="composer-slot">
                        <p className="read-the-docs">
                          Unknown component id: <code>{item.componentId}</code>
                        </p>
                      </article>
                    );
                  }

                  return (
                    <article
                      key={item.instanceId}
                      className="composer-slot"
                      style={{
                        gridColumn: `span ${Math.max(1, item.size.width)}`,
                        gridRow: `span ${Math.max(1, item.size.height)}`,
                      }}
                    >
                      <div className="composer-slot-toolbar">
                        <span>{registryItem.displayName}</span>
                        <button
                          type="button"
                          className="composer-slot-remove"
                          onClick={() => {
                            removeCanvasItem(item.instanceId);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="composer-slot-content">
                        <RemoteCanvasSlot
                          item={item}
                          registryItem={registryItem}
                          theme={hostTheme}
                          contextualData={{
                            registryComponentId: registryItem.id,
                            registryDisplayName: registryItem.displayName,
                            canvas: {
                              instanceId: item.instanceId,
                              size: item.size,
                              totalItems: canvasState.items.length,
                            },
                          }}
                          onRemoteEvent={handleRemoteEvent}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <section className="composer-state-preview">
            <h3>Serialized Canvas State</h3>
            <pre>{JSON.stringify(canvasState, null, 2)}</pre>
          </section>

          <section className="composer-state-preview">
            <h3>Remote Event Log</h3>
            <pre>{JSON.stringify(remoteEvents, null, 2)}</pre>
          </section>
        </section>
      </main>
    </DndContext>
  );
}

export default App;
