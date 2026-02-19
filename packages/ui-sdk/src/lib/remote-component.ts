import type { ComponentType } from "react"

export type RemoteComponentData = Record<string, unknown>

export type RemoteComponentTheme = {
  mode?: "light" | "dark" | "system"
  className?: string
  tokens?: Record<string, string>
} & Record<string, unknown>

export type RemoteComponentEventMap = Record<string, unknown>

export type RemoteComponentEventCallback<
  TEvents extends RemoteComponentEventMap = RemoteComponentEventMap,
> = <TEventName extends keyof TEvents & string>(
  eventName: TEventName,
  payload: TEvents[TEventName],
) => void

export interface RemoteComponentProps<
  TData = RemoteComponentData,
  TTheme = RemoteComponentTheme,
  TEvents extends RemoteComponentEventMap = RemoteComponentEventMap,
> {
  componentId?: string
  theme?: TTheme
  data?: TData
  onEvent?: RemoteComponentEventCallback<TEvents>
}

export type FederatedRemoteComponent<
  TData = RemoteComponentData,
  TTheme = RemoteComponentTheme,
  TEvents extends RemoteComponentEventMap = RemoteComponentEventMap,
> = ComponentType<RemoteComponentProps<TData, TTheme, TEvents>>

export interface FederatedRemoteModule<
  TData = RemoteComponentData,
  TTheme = RemoteComponentTheme,
  TEvents extends RemoteComponentEventMap = RemoteComponentEventMap,
> {
  default: FederatedRemoteComponent<TData, TTheme, TEvents>
}
