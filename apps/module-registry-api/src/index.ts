import "dotenv/config";
import { createApp } from "./app.js";

const { app, config } = await createApp();

try {
  await app.listen({
    host: config.host,
    port: config.port,
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
