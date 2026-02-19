export interface DefaultLayoutSize {
  width: number;
  height: number;
}

export interface RemoteComponentRegistryItem {
  id: string;
  displayName: string;
  remoteEntryUrl: string;
  remoteScope: string;
  exposedModule: `./${string}`;
  defaultLayoutSize: DefaultLayoutSize;
}

const defaultRemoteWidgetEntryUrl =
  typeof __REMOTE_WIDGET_ENTRY_URL__ === "string" &&
  __REMOTE_WIDGET_ENTRY_URL__.trim().length > 0
    ? __REMOTE_WIDGET_ENTRY_URL__
    : "/remotes/remote-widget/remoteEntry.js";

const defaultRemoteWidgetScope =
  typeof __REMOTE_WIDGET_SCOPE__ === "string" && __REMOTE_WIDGET_SCOPE__.trim().length > 0
    ? __REMOTE_WIDGET_SCOPE__
    : "remoteWidget";

export const componentRegistry = [
  {
    id: "mfa-register-widget",
    displayName: "MFA Register Widget",
    remoteEntryUrl: defaultRemoteWidgetEntryUrl,
    remoteScope: defaultRemoteWidgetScope,
    exposedModule: "./Widget",
    defaultLayoutSize: {
      width: 6,
      height: 4,
    },
  },
] as const satisfies readonly RemoteComponentRegistryItem[];
