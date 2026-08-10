import { z } from "zod";
import { createBenchmarkApp } from "./create-app";
import {
  loadValidatorAdapter,
  ValidatorNameSchema,
} from "../validators/registry";

const ServerArgumentsSchema = z.strictObject({
  variant: ValidatorNameSchema,
  port: z.coerce.number().int().min(0).max(65_535).default(3_000),
});

function readArguments(argumentsToParse: readonly string[]): unknown {
  const values: Record<string, string> = {};
  for (let index = 0; index < argumentsToParse.length; index += 1) {
    const flag = argumentsToParse[index];
    if (flag !== "--variant" && flag !== "--port") {
      throw new Error(`Unknown server argument at position ${index + 1}`);
    }
    const value = argumentsToParse[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing server value at position ${index + 1}`);
    }
    values[flag] = value;
    index += 1;
  }

  return { variant: values["--variant"], port: values["--port"] };
}

const argumentsResult = ServerArgumentsSchema.safeParse(
  readArguments(Bun.argv.slice(2)),
);
if (!argumentsResult.success) {
  throw new Error("Server arguments are invalid");
}

const adapter = await loadValidatorAdapter(argumentsResult.data.variant);
const app = createBenchmarkApp(adapter);
const server = Bun.serve({
  port: argumentsResult.data.port,
  fetch: app.fetch,
});

console.log(
  JSON.stringify({
    status: "ready",
    variant: adapter.name,
    port: server.port,
  }),
);
