import type { CanvasItem, CanvasState } from "./canvas-state";

const CANVAS_LAYOUT_STORAGE_KEY = "host.lowcode.canvas.layout.v1";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidCanvasItem(value: unknown): value is CanvasItem {
  if (!isObject(value)) {
    return false;
  }

  const { instanceId, componentId, size } = value;
  if (typeof instanceId !== "string" || typeof componentId !== "string") {
    return false;
  }

  if (!isObject(size)) {
    return false;
  }

  return (
    typeof size.width === "number" &&
    Number.isFinite(size.width) &&
    typeof size.height === "number" &&
    Number.isFinite(size.height)
  );
}

function isValidCanvasState(value: unknown): value is CanvasState {
  if (!isObject(value)) {
    return false;
  }

  if (value.version !== 1) {
    return false;
  }

  if (!Array.isArray(value.items)) {
    return false;
  }

  return value.items.every(isValidCanvasItem);
}

export function loadCanvasState(initialState: CanvasState): CanvasState {
  if (typeof window === "undefined") {
    return initialState;
  }

  try {
    const rawValue = window.localStorage.getItem(CANVAS_LAYOUT_STORAGE_KEY);
    if (!rawValue) {
      return initialState;
    }

    const parsed = JSON.parse(rawValue) as unknown;
    if (!isValidCanvasState(parsed)) {
      return initialState;
    }

    return parsed;
  } catch {
    return initialState;
  }
}

export function saveCanvasState(state: CanvasState) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(CANVAS_LAYOUT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota or privacy-mode errors for POC.
  }
}
