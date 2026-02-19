import "dotenv/config";
import awsLambdaFastify from "@fastify/aws-lambda";
import { createApp } from "./app.js";

const { app } = await createApp();

export const handler = awsLambdaFastify(app, {
  callbackWaitsForEmptyEventLoop: false,
});

await app.ready();
