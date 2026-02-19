import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  type FederatedRemoteComponent,
} from "@workspace/ui-sdk";

type WidgetData = {
  title?: string;
  description?: string;
  ctaLabel?: string;
};

type WidgetEvents = {
  cta_click: {
    componentId?: string;
    timestamp: string;
  };
};

const Widget: FederatedRemoteComponent<WidgetData, Record<string, unknown>, WidgetEvents> = ({
  componentId,
  data,
  onEvent,
}) => {
  return (
    <Card style={{ width: 360 }}>
      <CardHeader>
        <CardTitle>{data?.title ?? "Remote Widget"}</CardTitle>
        <CardDescription>
          {data?.description ?? "Composed at runtime with Module Federation."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        This component is exposed as <code>./Widget</code>.
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          onClick={() =>
            onEvent?.("cta_click", {
              componentId,
              timestamp: new Date().toISOString(),
            })
          }
        >
          {data?.ctaLabel ?? "Send Event"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default Widget;
