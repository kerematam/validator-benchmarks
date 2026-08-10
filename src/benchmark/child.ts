import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { createServer } from "node:net";
import { z } from "zod";
import { BENCHMARK_VALIDATION_PATH, createBenchmarkApp } from "../http/create-app";
import {
  getSyntheticProfile,
  SyntheticProfileNameSchema,
} from "../generator/profiles";
import {
  loadValidatorAdapter,
  ValidatorNameSchema,
} from "../validators/registry";
import {
  readMemorySnapshot,
  readResourceUsageSnapshot,
} from "./memory";
import {
  BenchmarkModeSchema,
  BenchmarkSampleSchema,
  type BenchmarkSample,
} from "./result-schema";

type SampleBase = Omit<
  BenchmarkSample,
  | "jsonParseNanoseconds"
  | "primaryMetric"
  | "primaryNanoseconds"
  | "responseStatus"
  | "outputReportCount"
  | "memoryBefore"
  | "memoryAfter"
  | "resourceUsageBefore"
  | "resourceUsageAfter"
>;

const ChildArgumentsSchema = z.strictObject({
  mode: BenchmarkModeSchema,
  variant: ValidatorNameSchema,
  profile: SyntheticProfileNameSchema,
  seed: z.coerce.number().int().min(0).max(0xffff_ffff),
  round: z.coerce.number().int().nonnegative(),
  order: z.coerce.number().int().nonnegative(),
  input: z.string().min(1),
});

function readArguments(argumentsToParse: readonly string[]): unknown {
  const values: Record<string, string> = {};
  for (let index = 0; index < argumentsToParse.length; index += 1) {
    const flag = argumentsToParse[index];
    if (
      flag !== "--mode" &&
      flag !== "--variant" &&
      flag !== "--profile" &&
      flag !== "--seed" &&
      flag !== "--round" &&
      flag !== "--order" &&
      flag !== "--input"
    ) {
      throw new Error(`Unknown child argument at position ${index + 1}`);
    }
    const value = argumentsToParse[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing child value at position ${index + 1}`);
    }
    values[flag] = value;
    index += 1;
  }

  return {
    mode: values["--mode"],
    variant: values["--variant"],
    profile: values["--profile"],
    seed: values["--seed"],
    round: values["--round"],
    order: values["--order"],
    input: values["--input"],
  };
}

function countReports(value: unknown): number {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return 0;
  }
  const data = Object.entries(value).find(([key]) => key === "data")?.[1];
  return Array.isArray(data) ? data.length : 0;
}

function warmupInput(): unknown {
  return {
    data: [
      {
        header: {},
        businessObject: { name: "Synthetic Warmup Object" },
        table: { columns: [{ key: "synthetic_column_01" }], rows: [] },
      },
    ],
  };
}

async function holdForMemoryDiagnostic(
  input: unknown,
  output: unknown,
): Promise<void> {
  const holdText = process.env.BENCHMARK_MEMORY_DIAGNOSTIC_HOLD_MS;
  const markerPath = process.env.BENCHMARK_MEMORY_DIAGNOSTIC_MARKER_PATH;
  if (holdText === undefined && markerPath === undefined) {
    return;
  }
  if (
    holdText === undefined ||
    markerPath === undefined ||
    !/^[0-9]+$/u.test(holdText) ||
    !markerPath.startsWith("/tmp/structured-report-memory-")
  ) {
    throw new Error("Memory diagnostic hold configuration is invalid");
  }
  const holdMilliseconds = Number(holdText);
  if (!Number.isSafeInteger(holdMilliseconds) || holdMilliseconds > 5_000) {
    throw new Error("Memory diagnostic hold duration is invalid");
  }
  await Bun.write(markerPath, "validation-complete\n");
  await Bun.sleep(holdMilliseconds);
  if (countReports(input) !== countReports(output)) {
    throw new Error("Memory diagnostic did not retain input and output");
  }
}

async function reserveLoopbackPort(): Promise<number> {
  const reservation = createServer();
  await new Promise<void>((resolveListening, rejectListening) => {
    reservation.once("error", rejectListening);
    reservation.listen(0, "127.0.0.1", () => resolveListening());
  });
  const address = reservation.address();
  if (address === null || typeof address === "string") {
    reservation.close();
    throw new Error("Failed to reserve a loopback port");
  }
  const port = address.port;
  await new Promise<void>((resolveClosed, rejectClosed) => {
    reservation.close((error) => {
      if (error) {
        rejectClosed(error);
      } else {
        resolveClosed();
      }
    });
  });
  return port;
}

async function runValidatorSample(
  inputText: string,
  base: SampleBase,
): Promise<BenchmarkSample> {
  const adapter = await loadValidatorAdapter(
    base.variant,
    base.validationEnvelope,
  );
  const warmup = adapter.validate(warmupInput());
  if (!warmup.success && adapter.name !== "none") {
    throw new Error("Validator warmup failed");
  }

  const parseStartedAt = Bun.nanoseconds();
  const input: unknown = JSON.parse(inputText);
  const jsonParseNanoseconds = Bun.nanoseconds() - parseStartedAt;
  const memoryBefore = readMemorySnapshot();
  const resourceUsageBefore = readResourceUsageSnapshot();
  const validationStartedAt = Bun.nanoseconds();
  const result = adapter.validate(input);
  const primaryNanoseconds = Bun.nanoseconds() - validationStartedAt;
  if (!result.success) {
    throw new Error("A valid benchmark profile failed validation");
  }
  const retained = result.data;
  const resourceUsageAfter = readResourceUsageSnapshot();
  const memoryAfter = readMemorySnapshot();
  const inputReportCount = countReports(input);
  const outputReportCount = countReports(retained);
  if (inputText.length === 0 || inputReportCount !== outputReportCount) {
    throw new Error("Benchmark input was not retained through measurement");
  }
  await holdForMemoryDiagnostic(input, retained);

  return BenchmarkSampleSchema.parse({
    ...base,
    primaryMetric: "validation-and-normalization",
    jsonParseNanoseconds,
    primaryNanoseconds,
    responseStatus: null,
    outputReportCount,
    memoryBefore,
    memoryAfter,
    resourceUsageBefore,
    resourceUsageAfter,
  });
}

async function runHttpSample(
  inputText: string,
  base: SampleBase,
): Promise<BenchmarkSample> {
  const adapter = await loadValidatorAdapter(
    base.variant,
    base.validationEnvelope,
  );
  let retainedInput: unknown;
  let retained: unknown;
  const app = createBenchmarkApp(adapter, {
    onParsed(value) {
      retainedInput = value;
    },
    onValidated(value) {
      retained = value;
    },
  });
  const port = await reserveLoopbackPort();
  const server = Bun.serve({ hostname: "127.0.0.1", port, fetch: app.fetch });
  const url = `http://127.0.0.1:${server.port}${BENCHMARK_VALIDATION_PATH}`;

  try {
    const warmupResponse = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(warmupInput()),
    });
    await warmupResponse.arrayBuffer();
    if (!warmupResponse.ok) {
      throw new Error("HTTP warmup failed");
    }

    retainedInput = undefined;
    retained = undefined;
    const memoryBefore = readMemorySnapshot();
    const resourceUsageBefore = readResourceUsageSnapshot();
    const requestStartedAt = Bun.nanoseconds();
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: inputText,
    });
    await response.arrayBuffer();
    const primaryNanoseconds = Bun.nanoseconds() - requestStartedAt;
    if (!response.ok) {
      throw new Error("A valid HTTP benchmark profile failed validation");
    }
    const resourceUsageAfter = readResourceUsageSnapshot();
    const memoryAfter = readMemorySnapshot();
    const inputReportCount = countReports(retainedInput);
    const outputReportCount = countReports(retained);
    if (inputText.length === 0 || inputReportCount !== outputReportCount) {
      throw new Error("HTTP benchmark input was not retained through measurement");
    }

    return BenchmarkSampleSchema.parse({
      ...base,
      primaryMetric: "http-round-trip",
      jsonParseNanoseconds: null,
      primaryNanoseconds,
      responseStatus: response.status,
      outputReportCount,
      memoryBefore,
      memoryAfter,
      resourceUsageBefore,
      resourceUsageAfter,
    });
  } finally {
    server.stop(true);
  }
}

const argumentsResult = ChildArgumentsSchema.safeParse(
  readArguments(Bun.argv.slice(2)),
);
if (!argumentsResult.success) {
  throw new Error("Benchmark child arguments are invalid");
}

const inputText = await Bun.file(argumentsResult.data.input).text();
const profile = getSyntheticProfile(argumentsResult.data.profile);
const base: SampleBase = {
  schemaVersion: 3,
  development: true,
  mode: argumentsResult.data.mode,
  variant: argumentsResult.data.variant,
  profile: argumentsResult.data.profile,
  validationEnvelope: profile.validationEnvelope,
  maximumReports: profile.maximumReports,
  seed: argumentsResult.data.seed,
  round: argumentsResult.data.round,
  order: argumentsResult.data.order,
  processId: process.pid,
  inputBytes: Buffer.byteLength(inputText, "utf8"),
  inputSha256: createHash("sha256").update(inputText).digest("hex"),
  osPeakRssBytes: null,
};
const sample =
  argumentsResult.data.mode === "validator"
    ? await runValidatorSample(inputText, base)
    : await runHttpSample(inputText, base);

console.log(JSON.stringify(sample));
