import {
  DndContext,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import type { RemoteComponentTheme } from "@workspace/ui-sdk";
import type { CanvasState } from "./composer/canvas-state";
import { loadCanvasState, saveCanvasState } from "./composer/layout-storage";
import type { HostRemoteEvent } from "./composer/remote-events";
import { RemoteCanvasSlot } from "./components/remote-canvas-slot";
import { type RemoteComponentRegistryItem } from "./registry/component-registry";
import { fetchComponentRegistry } from "./registry/registry-client";

const COMPOSER_CANVAS_DROPZONE_ID = "composer-canvas";
const MIN_CANVAS_SPAN = 2;
const MAX_CANVAS_WIDTH_SPAN = 12;
const MAX_CANVAS_HEIGHT_SPAN = 12;

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

function clampSpan(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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

interface ComposerCanvasProps {
  canvasState: CanvasState;
  registryById: Map<string, RemoteComponentRegistryItem>;
  hostTheme: RemoteComponentTheme;
  onRemoveCanvasItem: (instanceId: string) => void;
  onCommitCanvasItemSize: (instanceId: string, width: number, height: number) => void;
  onRemoteEvent: (event: HostRemoteEvent) => void;
}

function ComposerCanvas({
  canvasState,
  registryById,
  hostTheme,
  onRemoveCanvasItem,
  onCommitCanvasItemSize,
  onRemoteEvent,
}: ComposerCanvasProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: COMPOSER_CANVAS_DROPZONE_ID,
  });

  const handleResizeMouseDown = (
    event: MouseEvent<HTMLButtonElement>,
    instanceId: string,
    startWidth: number,
    startHeight: number,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const slotElement = event.currentTarget.closest(".composer-slot");
    const gridElement = event.currentTarget.closest(".composer-grid");
    if (!(slotElement instanceof HTMLElement) || !(gridElement instanceof HTMLElement)) {
      return;
    }
    const sizeLabel = slotElement.querySelector<HTMLElement>(".composer-slot-size");

    const computedGridStyle = window.getComputedStyle(gridElement);
    const columnGap = Number.parseFloat(computedGridStyle.columnGap) || 0;
    const rowGap = Number.parseFloat(computedGridStyle.rowGap) || 0;
    const autoRows = Number.parseFloat(computedGridStyle.gridAutoRows) || 60;
    const gridRect = gridElement.getBoundingClientRect();
    const columnWidth = (gridRect.width - columnGap * (MAX_CANVAS_WIDTH_SPAN - 1)) / MAX_CANVAS_WIDTH_SPAN;

    const startX = event.clientX;
    const startY = event.clientY;
    let appliedWidth = startWidth;
    let appliedHeight = startHeight;
    let previewWidth = startWidth;
    let previewHeight = startHeight;

    const onMouseMove = (moveEvent: globalThis.MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const widthDeltaFromStart = Math.round(deltaX / (columnWidth + columnGap));
      const heightDeltaFromStart = Math.round(deltaY / (autoRows + rowGap));
      const targetWidth = clampSpan(
        startWidth + widthDeltaFromStart,
        MIN_CANVAS_SPAN,
        MAX_CANVAS_WIDTH_SPAN,
      );
      const targetHeight = clampSpan(
        startHeight + heightDeltaFromStart,
        MIN_CANVAS_SPAN,
        MAX_CANVAS_HEIGHT_SPAN,
      );
      const widthDelta = targetWidth - appliedWidth;
      const heightDelta = targetHeight - appliedHeight;

      if (widthDelta !== 0 || heightDelta !== 0) {
        appliedWidth = targetWidth;
        appliedHeight = targetHeight;
        previewWidth = targetWidth;
        previewHeight = targetHeight;
        slotElement.style.gridColumn = `span ${targetWidth}`;
        slotElement.style.gridRow = `span ${targetHeight}`;
        if (sizeLabel) {
          sizeLabel.textContent = `${targetWidth}x${targetHeight}`;
        }
      }
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      onCommitCanvasItemSize(instanceId, previewWidth, previewHeight);
    };

    document.body.style.userSelect = "none";
    document.body.style.cursor = "nwse-resize";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  return (
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
                  <div className="composer-slot-actions">
                    <span className="composer-slot-size">
                      {item.size.width}x{item.size.height}
                    </span>
                    <button
                      type="button"
                      className="composer-slot-remove"
                      onClick={() => {
                        onRemoveCanvasItem(item.instanceId);
                      }}
                    >
                      Remove
                    </button>
                  </div>
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
                    onRemoteEvent={onRemoteEvent}
                  />
                </div>
                <button
                  type="button"
                  className="composer-slot-resize-handle"
                  aria-label={`Resize ${registryItem.displayName}`}
                  onMouseDown={(mouseEvent) => {
                    handleResizeMouseDown(
                      mouseEvent,
                      item.instanceId,
                      item.size.width,
                      item.size.height,
                    );
                  }}
                />
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function App() {
  const [canvasState, setCanvasState] = useState<CanvasState>(() =>
    loadCanvasState(initialCanvasState),
  );
  const [remoteEvents, setRemoteEvents] = useState<HostRemoteEvent[]>([]);
  const [registryModules, setRegistryModules] = useState<RemoteComponentRegistryItem[]>([]);
  const [registryLoading, setRegistryLoading] = useState<boolean>(true);
  const [registryError, setRegistryError] = useState<string | null>(null);

  const registryById = useMemo(
    () =>
      new Map<string, RemoteComponentRegistryItem>(
        registryModules.map((item) => [item.id, item]),
      ),
    [registryModules],
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

  const commitCanvasItemSize = (instanceId: string, width: number, height: number) => {
    setCanvasState((currentState) => ({
      ...currentState,
      items: currentState.items.map((item) => {
        if (item.instanceId !== instanceId) {
          return item;
        }

        return {
          ...item,
          size: {
            width: clampSpan(width, MIN_CANVAS_SPAN, MAX_CANVAS_WIDTH_SPAN),
            height: clampSpan(height, MIN_CANVAS_SPAN, MAX_CANVAS_HEIGHT_SPAN),
          },
        };
      }),
    }));
  };

  useEffect(() => {
    saveCanvasState(canvasState);
  }, [canvasState]);

  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();

    fetchComponentRegistry(controller.signal)
      .then((registryItems) => {
        if (disposed) {
          return;
        }

        setRegistryModules(registryItems);
        setRegistryError(null);
      })
      .catch((error: unknown) => {
        if (disposed) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Failed to fetch module registry.";
        setRegistryModules([]);
        setRegistryError(message);
      })
      .finally(() => {
        if (!disposed) {
          setRegistryLoading(false);
        }
      });

    return () => {
      disposed = true;
      controller.abort();
    };
  }, []);

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
          <p>
            Drag components into the canvas to compose UI.
            {registryLoading
              ? " Fetching modules from backend..."
              : ` Loaded ${registryModules.length} modules from backend.`}
          </p>
          {registryError ? <p className="read-the-docs">Registry error: {registryError}</p> : null}
          {!registryLoading && registryModules.length === 0 ? (
            <p className="read-the-docs">
              No modules available. Register modules in Fastify/DynamoDB first.
            </p>
          ) : null}
          <div className="composer-sidebar-list">
            {registryModules.map((item) => (
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

          <ComposerCanvas
            canvasState={canvasState}
            registryById={registryById}
            hostTheme={hostTheme}
            onRemoveCanvasItem={removeCanvasItem}
            onCommitCanvasItemSize={commitCanvasItemSize}
            onRemoteEvent={handleRemoteEvent}
          />

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
