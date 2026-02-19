import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  type FederatedRemoteComponent,
  type RemoteComponentTheme,
} from "@workspace/ui-sdk";

type WidgetData = {
  title?: string;
  description?: string;
  ctaLabel?: string;
  registryComponentId?: string;
  registryDisplayName?: string;
  canvas?: {
    instanceId?: string;
    size?: {
      width?: number;
      height?: number;
    };
    totalItems?: number;
  };
};

type WidgetEvents = {
  cta_click: {
    componentId?: string;
    registryComponentId?: string;
    timestamp: string;
  };
  widget_loaded: {
    componentId?: string;
    registryComponentId?: string;
    timestamp: string;
  };
};

type WidgetTheme = RemoteComponentTheme;

const Widget: FederatedRemoteComponent<WidgetData, WidgetTheme, WidgetEvents> = ({
  componentId,
  theme,
  data,
  onEvent,
}) => {
  const accentColor =
    typeof theme?.tokens?.accentColor === "string"
      ? theme.tokens.accentColor
      : "#1570ef";

  return (
    <Card
      style={{
        width: 360,
        borderColor: accentColor,
      }}
    >
      <CardHeader>
        <CardTitle>{data?.title ?? "Remote Widget"}</CardTitle>
        <CardDescription>
          {data?.description ?? "Composed at runtime with Module Federation."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p style={{ margin: 0 }}>
          This component is exposed as <code>./Widget</code>.
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "#667085" }}>
          Context: <code>{data?.registryDisplayName ?? "unknown"}</code> / total items{" "}
          <code>{data?.canvas?.totalItems ?? 0}</code>
        </p>
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          onClick={() =>
            onEvent?.("cta_click", {
              componentId,
              registryComponentId: data?.registryComponentId,
              timestamp: new Date().toISOString(),
            })
          }
        >
          {data?.ctaLabel ?? "Send Event"}
        </Button>
        <Button
          type="button"
          variant="outline"
          style={{ marginLeft: 8 }}
          onClick={() =>
            onEvent?.("widget_loaded", {
              componentId,
              registryComponentId: data?.registryComponentId,
              timestamp: new Date().toISOString(),
            })
          }
        >
          Emit Generic Event
        </Button>
      </CardFooter>
    </Card>
  );
};

export default Widget;
