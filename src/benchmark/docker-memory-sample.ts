import { readFile } from "node:fs/promises";
import { z } from "zod";
import {
  DockerMemorySampleSchema,
  MemoryTraceObservationSchema,
  type MemoryTraceObservation,
} from "./docker-memory-schema";
import { BenchmarkSampleSchema } from "./result-schema";
import { ValidatorNameSchema } from "../validators/registry";

const ArgumentsSchema = z.strictObject({
  variant: ValidatorNameSchema,
  round: z.coerce.number().int().nonnegative(),
  order: z.coerce.number().int().nonnegative(),
  seed: z.coerce.number().int().min(0).max(0xffff_ffff),
  input: z.string().min(1),
  samplingIntervalMilliseconds: z.coerce.number().int().min(1).max(100),
});

const CGROUP_ROOT = "/sys/fs/cgroup";
const SMAPS_SAMPLE_MULTIPLIER = 5;
const DIAGNOSTIC_HOLD_MILLISECONDS = 250;

function readArguments(argumentsToParse: readonly string[]): unknown {
  const values: Record<string, string> = {};
  for (let index = 0; index < argumentsToParse.length; index += 1) {
    const flag = argumentsToParse[index];
    if (
      flag !== "--variant" &&
      flag !== "--round" &&
      flag !== "--order" &&
      flag !== "--seed" &&
      flag !== "--input" &&
      flag !== "--sampling-interval-ms"
    ) {
      throw new Error(`Unknown memory-sample argument at position ${index + 1}`);
    }
    const value = argumentsToParse[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing memory-sample value at position ${index + 1}`);
    }
    values[flag] = value;
    index += 1;
  }

  return {
    variant: values["--variant"],
    round: values["--round"],
    order: values["--order"],
    seed: values["--seed"],
    input: values["--input"],
    samplingIntervalMilliseconds: values["--sampling-interval-ms"],
  };
}

function parseKilobyteField(text: string, field: string): number | null {
  const line = text
    .split("\n")
    .find((candidate) => candidate.startsWith(`${field}:`));
  if (line === undefined) {
    return null;
  }
  const match = /^\S+:\s+([0-9]+)\s+kB$/u.exec(line.trim());
  if (match?.[1] === undefined) {
    return null;
  }
  return Number(match[1]) * 1_024;
}

export function parseProcStatus(text: string): {
  readonly rssBytes: number | null;
  readonly highWaterRssBytes: number | null;
} {
  return {
    rssBytes: parseKilobyteField(text, "VmRSS"),
    highWaterRssBytes: parseKilobyteField(text, "VmHWM"),
  };
}

export function parseSmapsRollup(text: string): {
  readonly pssBytes: number | null;
  readonly privateBytes: number | null;
} {
  const privateClean = parseKilobyteField(text, "Private_Clean");
  const privateDirty = parseKilobyteField(text, "Private_Dirty");
  const privateHuge = parseKilobyteField(text, "Private_Hugetlb");
  const privateParts = [privateClean, privateDirty, privateHuge].filter(
    (value): value is number => value !== null,
  );
  return {
    pssBytes: parseKilobyteField(text, "Pss"),
    privateBytes:
      privateParts.length > 0
        ? privateParts.reduce((total, value) => total + value, 0)
        : null,
  };
}

async function readInteger(path: string): Promise<number> {
  const text = (await readFile(path, "utf8")).trim();
  const value = Number(text);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Expected a nonnegative cgroup integer at ${path}`);
  }
  return value;
}

async function readMemoryEvents(): Promise<{
  readonly oom: number;
  readonly oomKill: number;
}> {
  const text = await readFile(`${CGROUP_ROOT}/memory.events`, "utf8");
  const values = new Map<string, number>();
  for (const line of text.trim().split("\n")) {
    const [key, rawValue] = line.split(/\s+/u);
    const value = Number(rawValue);
    if (key !== undefined && Number.isSafeInteger(value) && value >= 0) {
      values.set(key, value);
    }
  }
  return {
    oom: values.get("oom") ?? 0,
    oomKill: values.get("oom_kill") ?? 0,
  };
}

async function readObservation(
  pid: number,
  startedAt: number,
  includeSmaps: boolean,
): Promise<MemoryTraceObservation> {
  const [cgroupCurrentBytes, statusText, smapsText] = await Promise.all([
    readInteger(`${CGROUP_ROOT}/memory.current`),
    readFile(`/proc/${pid}/status`, "utf8").catch(() => null),
    includeSmaps
      ? readFile(`/proc/${pid}/smaps_rollup`, "utf8").catch(() => null)
      : Promise.resolve(null),
  ]);
  const status = statusText === null ? null : parseProcStatus(statusText);
  const smaps = smapsText === null ? null : parseSmapsRollup(smapsText);
  return MemoryTraceObservationSchema.parse({
    elapsedNanoseconds: Bun.nanoseconds() - startedAt,
    cgroupCurrentBytes,
    processRssBytes: status?.rssBytes ?? null,
    processHighWaterRssBytes: status?.highWaterRssBytes ?? null,
    processPssBytes: smaps?.pssBytes ?? null,
    processPrivateBytes: smaps?.privateBytes ?? null,
  });
}

function maximumObserved(
  observations: readonly MemoryTraceObservation[],
  select: (observation: MemoryTraceObservation) => number | null,
): number {
  return Math.max(
    0,
    ...observations.flatMap((observation) => {
      const value = select(observation);
      return value === null ? [] : [value];
    }),
  );
}

async function main(): Promise<void> {
const argumentsResult = ArgumentsSchema.safeParse(
  readArguments(Bun.argv.slice(2)),
);
if (!argumentsResult.success) {
  throw new Error("Docker memory-sample arguments are invalid");
}
const options = argumentsResult.data;
const cgroupBaselineBytes = await readInteger(
  `${CGROUP_ROOT}/memory.current`,
);
const cgroupMemoryLimitBytes = await readInteger(
  `${CGROUP_ROOT}/memory.max`,
);
const cgroupSwapLimitBytes = await readInteger(
  `${CGROUP_ROOT}/memory.swap.max`,
);
const startedAt = Bun.nanoseconds();
const markerPath = `/tmp/structured-report-memory-${process.pid}`;
const child = Bun.spawn(
  [
    Bun.argv[0] ?? "bun",
    "run",
    "src/benchmark/child.ts",
    "--mode",
    "validator",
    "--variant",
    options.variant,
    "--profile",
    "diagnostic-10000",
    "--seed",
    String(options.seed),
    "--round",
    String(options.round),
    "--order",
    String(options.order),
    "--input",
    options.input,
  ],
  {
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      BENCHMARK_MEMORY_DIAGNOSTIC_HOLD_MS: String(
        DIAGNOSTIC_HOLD_MILLISECONDS,
      ),
      BENCHMARK_MEMORY_DIAGNOSTIC_MARKER_PATH: markerPath,
    },
  },
);
const stdoutPromise = new Response(child.stdout).text();
const stderrPromise = new Response(child.stderr).text();
let finished = false;
const exitCodePromise = child.exited.then((exitCode) => {
  finished = true;
  return exitCode;
});
const observations: MemoryTraceObservation[] = [];
let validationComplete = false;
let observationsSinceSmaps = SMAPS_SAMPLE_MULTIPLIER;
while (!finished) {
  validationComplete ||= await Bun.file(markerPath).exists();
  const includeSmaps =
    validationComplete && observationsSinceSmaps >= SMAPS_SAMPLE_MULTIPLIER;
  observations.push(
    await readObservation(child.pid, startedAt, includeSmaps),
  );
  observationsSinceSmaps = includeSmaps ? 0 : observationsSinceSmaps + 1;
  await Bun.sleep(options.samplingIntervalMilliseconds);
}
const exitCode = await exitCodePromise;
const cgroupPeakBytes = await readInteger(`${CGROUP_ROOT}/memory.peak`);
const memoryEvents = await readMemoryEvents();
const [stdout, stderr] = await Promise.all([stdoutPromise, stderrPromise]);
if (exitCode !== 0) {
  throw new Error(
    `Measured child failed with exit code ${exitCode}: ${stderr.trim().slice(0, 2_000)}`,
  );
}
if (observations.length === 0) {
  throw new Error("Memory sampler did not capture any observations");
}

const benchmarkInput: unknown = JSON.parse(stdout);
const processHighWaterRssPeakBytes = Math.max(
  maximumObserved(
    observations,
    (observation) => observation.processHighWaterRssBytes,
  ),
  BenchmarkSampleSchema.parse(benchmarkInput).resourceUsageAfter
    .maximumResidentSetSizeBytes,
);
const benchmark = BenchmarkSampleSchema.parse({
  ...BenchmarkSampleSchema.parse(benchmarkInput),
  osPeakRssBytes: processHighWaterRssPeakBytes,
});

console.log(
  JSON.stringify(
    DockerMemorySampleSchema.parse({
      schemaVersion: 1,
      development: true,
      variant: options.variant,
      round: options.round,
      order: options.order,
      samplingIntervalMilliseconds: options.samplingIntervalMilliseconds,
      smapsSamplingIntervalMilliseconds:
        options.samplingIntervalMilliseconds * SMAPS_SAMPLE_MULTIPLIER,
      observationCount: observations.length,
      cgroupMemoryLimitBytes,
      cgroupSwapLimitBytes,
      cgroupBaselineBytes,
      cgroupPeakBytes,
      sampledCgroupPeakBytes: maximumObserved(
        observations,
        (observation) => observation.cgroupCurrentBytes,
      ),
      sampledProcessRssPeakBytes: maximumObserved(
        observations,
        (observation) => observation.processRssBytes,
      ),
      processHighWaterRssPeakBytes,
      sampledProcessPssPeakBytes: maximumObserved(
        observations,
        (observation) => observation.processPssBytes,
      ),
      sampledProcessPrivatePeakBytes: maximumObserved(
        observations,
        (observation) => observation.processPrivateBytes,
      ),
      cgroupOomEvents: memoryEvents.oom,
      cgroupOomKillEvents: memoryEvents.oomKill,
      benchmark,
      observations,
    }),
  ),
);
}

if (import.meta.main) {
  await main();
}
