export interface CanvasItemSize {
  width: number;
  height: number;
}

export interface CanvasItem {
  instanceId: string;
  componentId: string;
  size: CanvasItemSize;
}

export interface CanvasState {
  version: 1;
  items: CanvasItem[];
}
