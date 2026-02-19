export interface HostRemoteEvent {
  instanceId: string;
  registryComponentId: string;
  registryDisplayName: string;
  eventName: string;
  payload: unknown;
  timestamp: string;
}

export type HostRemoteEventHandler = (event: HostRemoteEvent) => void;
