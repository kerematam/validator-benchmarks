import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { cpus, loadavg, totalmem } from "node:os";
import { join, resolve } from "node:path";
import { z } from "zod";
import {
  GeneratedProfileManifestSchema,
  type GeneratedProfileManifest,
} from "../generator/manifest";
import {
  getSyntheticProfile,
  SyntheticProfileNameSchema,
  type SyntheticProfileName,
} from "../generator/profiles";
import {
  ValidatorNameSchema,
  type ValidatorName,
} from "../validators/registry";
import {
  BenchmarkModeSchema,
  BenchmarkRunSchema,
  BenchmarkSampleSchema,
  type BenchmarkMode,
  type BenchmarkSample,
} from "./result-schema";
import { summarizeBenchmarkRun } from "./summarize";

const CoordinatorArgumentsSchema = z.strictObject({
  profile: SyntheticProfileNameSchema.default("smoke"),
  seed: z.coerce.number().int().min(0).max(0xffff_ffff).default(20_260_807),
  rounds: z.coerce.number().int().min(1).max(100).default(10),
  mode: z.enum(["validator", "http", "both"]).default("both"),
});

const VARIANTS: readonly ValidatorName[] = ValidatorNameSchema.options;

function readArguments(argumentsToParse: readonly string[]): unknown {
  const values: Record<string, string> = {};
  for (let index = 0; index < argumentsToParse.length; index += 1) {
    const flag = argumentsToParse[index];
    if (
      flag !== "--profile" &&
      flag !== "--seed" &&
      flag !== "--rounds" &&
      flag !== "--mode"
    ) {
      throw new Error(`Unknown coordinator argument at position ${index + 1}`);
    }
    const value = argumentsToParse[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing coordinator value at position ${index + 1}`);
    }
    if (values[flag] !== undefined) {
      throw new Error(`Duplicate coordinator argument at position ${index + 1}`);
    }
    values[flag] = value;
    index += 1;
  }

  return {
    profile: values["--profile"],
    seed: values["--seed"],
    rounds: values["--rounds"],
    mode: values["--mode"],
  };
}

async function runGate(command: string[], name: string): Promise<void> {
  const process = Bun.spawn(command, { stdout: "pipe", stderr: "pipe" });
  const [exitCode, stdout, stderr] = await Promise.all([
    process.exited,
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
  ]);
  if (exitCode !== 0) {
    throw new Error(
      `${name} failed:\n${(stderr.trim() || stdout.trim()).slice(0, 4_000)}`,
    );
  }
}

function modesFor(value: "validator" | "http" | "both"): BenchmarkMode[] {
  return value === "both" ? ["validator", "http"] : [value];
}

function rotateVariants(offset: number): readonly ValidatorName[] {
  return VARIANTS.map(
    (_, index) => VARIANTS[(index + offset) % VARIANTS.length],
  ).filter((name): name is ValidatorName => name !== undefined);
}

function parseOsPeakRss(stderr: string): number | null {
  if (process.platform === "darwin") {
    const match = /(?:^|\n)\s*([0-9]+)\s+maximum resident set size/iu.exec(
      stderr,
    );
    return match?.[1] === undefined ? null : Number(match[1]);
  }
  if (process.platform === "linux") {
    const match = /Maximum resident set size \(kbytes\):\s*([0-9]+)/iu.exec(
      stderr,
    );
    return match?.[1] === undefined ? null : Number(match[1]) * 1_024;
  }
  return null;
}

function timedChildCommand(argumentsToPass: readonly string[]): string[] {
  const bunCommand = [
    Bun.argv[0] ?? "bun",
    "run",
    "src/benchmark/child.ts",
    ...argumentsToPass,
  ];
  if (process.platform === "darwin") {
    return ["/usr/bin/time", "-l", ...bunCommand];
  }
  if (process.platform === "linux") {
    return ["/usr/bin/time", "-v", ...bunCommand];
  }
  return bunCommand;
}

async function runSample(
  mode: BenchmarkMode,
  variant: ValidatorName,
  profile: SyntheticProfileName,
  seed: number,
  round: number,
  order: number,
  inputPath: string,
  manifest: GeneratedProfileManifest,
): Promise<BenchmarkSample> {
  const childArguments = [
    "--mode",
    mode,
    "--variant",
    variant,
    "--profile",
    profile,
    "--seed",
    String(seed),
    "--round",
    String(round),
    "--order",
    String(order),
    "--input",
    inputPath,
  ];
  const child = Bun.spawn(timedChildCommand(childArguments), {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  const timeMetadataUnavailable =
    process.platform === "darwin" &&
    stderr.includes("time: sysctl kern.clockrate: Operation not permitted");
  if (exitCode !== 0 && !timeMetadataUnavailable) {
    throw new Error(
      `Benchmark child failed for ${mode}/${variant}: ${stderr.trim().slice(0, 4_000)}`,
    );
  }

  let parsedOutput: unknown;
  try {
    parsedOutput = JSON.parse(stdout);
  } catch {
    throw new Error(
      `Benchmark child emitted invalid output for ${mode}/${variant}: ${stderr.trim().slice(0, 4_000)}`,
    );
  }
  const sample = BenchmarkSampleSchema.parse({
    ...BenchmarkSampleSchema.parse(parsedOutput),
    osPeakRssBytes: parseOsPeakRss(stderr),
  });
  if (
    sample.inputBytes !== manifest.encodedBytes ||
    sample.inputSha256 !== manifest.sha256
  ) {
    throw new Error("Benchmark child input identity did not match its manifest");
  }
  return sample;
}

function readGitRevision(): string | null {
  try {
    const result = Bun.spawnSync({
      cmd: ["git", "rev-parse", "HEAD"],
      stdout: "pipe",
      stderr: "ignore",
    });
    if (result.exitCode !== 0) {
      return null;
    }
    const revision = new TextDecoder().decode(result.stdout).trim();
    return revision || null;
  } catch {
    return null;
  }
}

function readHostActivitySnapshot() {
  const [oneMinute = 0, fiveMinutes = 0, fifteenMinutes = 0] = loadavg();
  const unavailableSnapshot = () => ({
    capturedAt: new Date().toISOString(),
    loadAverage1Minute: oneMinute,
    loadAverage5Minutes: fiveMinutes,
    loadAverage15Minutes: fifteenMinutes,
    aggregateCpuPercent: null,
    busyProcessCount: null,
  });
  try {
    const processSample = Bun.spawnSync({
      cmd: ["ps", "-Ao", "%cpu="],
      stdout: "pipe",
      stderr: "ignore",
    });
    if (processSample.exitCode !== 0) {
      return unavailableSnapshot();
    }

    const cpuValues = new TextDecoder()
      .decode(processSample.stdout)
      .split("\n")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value >= 0);
    return {
      capturedAt: new Date().toISOString(),
      loadAverage1Minute: oneMinute,
      loadAverage5Minutes: fiveMinutes,
      loadAverage15Minutes: fifteenMinutes,
      aggregateCpuPercent: cpuValues.reduce((total, value) => total + value, 0),
      busyProcessCount: cpuValues.filter((value) => value >= 10).length,
    };
  } catch {
    return unavailableSnapshot();
  }
}

function readPowerMode(): string | null {
  if (process.platform !== "darwin") {
    return null;
  }
  const result = Bun.spawnSync({
    cmd: ["pmset", "-g", "batt"],
    stdout: "pipe",
    stderr: "ignore",
  });
  if (result.exitCode !== 0) {
    return null;
  }
  const output = new TextDecoder().decode(result.stdout);
  if (output.includes("AC Power")) {
    return "AC Power";
  }
  if (output.includes("Battery Power")) {
    return "Battery Power";
  }
  return null;
}

async function readOptionalCgroupValue(path: string): Promise<string | null> {
  try {
    return (await readFile(path, "utf8")).trim() || null;
  } catch {
    return null;
  }
}

function parseCgroupInteger(value: string | null): number | null {
  if (value === null || value === "max") {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

async function readContainerLimits(
  executionEnvironment: "native-host" | "docker",
) {
  if (executionEnvironment !== "docker") {
    return null;
  }
  const [memory, swap, memoryPeak, memoryCurrent, cpu, cpuset, processes] =
    await Promise.all([
    readOptionalCgroupValue("/sys/fs/cgroup/memory.max"),
    readOptionalCgroupValue("/sys/fs/cgroup/memory.swap.max"),
    readOptionalCgroupValue("/sys/fs/cgroup/memory.peak"),
    readOptionalCgroupValue("/sys/fs/cgroup/memory.current"),
    readOptionalCgroupValue("/sys/fs/cgroup/cpu.max"),
    readOptionalCgroupValue("/sys/fs/cgroup/cpuset.cpus.effective"),
    readOptionalCgroupValue("/sys/fs/cgroup/pids.max"),
    ]);
  const [quotaText, periodText] = cpu?.split(/\s+/u) ?? [];
  const quota = parseCgroupInteger(quotaText ?? null);
  const period = parseCgroupInteger(periodText ?? null);
  return {
    memoryLimitBytes: parseCgroupInteger(memory),
    swapLimitBytes: parseCgroupInteger(swap),
    wholeRunMemoryPeakBytes: parseCgroupInteger(memoryPeak),
    memoryCurrentAtResultBytes: parseCgroupInteger(memoryCurrent),
    cpuQuotaCores:
      quota !== null && period !== null && period > 0 ? quota / period : null,
    cpusetCpus:
      cpuset !== null && /^[0-9,-]+$/u.test(cpuset) ? cpuset : null,
    processLimit: parseCgroupInteger(processes),
  };
}

const argumentsResult = CoordinatorArgumentsSchema.safeParse(
  readArguments(Bun.argv.slice(2)),
);
if (!argumentsResult.success) {
  throw new Error("Benchmark coordinator arguments are invalid");
}
const options = argumentsResult.data;
const profile = getSyntheticProfile(options.profile);
const modes = modesFor(options.mode);
const hostActivityBefore = readHostActivitySnapshot();
const executionEnvironment = (await Bun.file("/.dockerenv").exists())
  ? "docker"
  : "native-host";

console.error("[benchmark] running correctness gate");
await runGate([Bun.argv[0] ?? "bun", "run", "test"], "Correctness gate");
console.error("[benchmark] generating deterministic input");
await runGate(
  [
    Bun.argv[0] ?? "bun",
    "run",
    "generate",
    "--profile",
    options.profile,
    "--seed",
    String(options.seed),
  ],
  "Generator gate",
);

const generatedDirectory = resolve(
  `.generated/${options.profile}-seed-${options.seed}`,
);
const inputPath = join(generatedDirectory, "request.json");
const manifestPath = join(generatedDirectory, "manifest.json");
const manifestInput: unknown = JSON.parse(await readFile(manifestPath, "utf8"));
const manifest = GeneratedProfileManifestSchema.parse(manifestInput);
const samples: BenchmarkSample[] = [];

for (let round = 0; round < options.rounds; round += 1) {
  for (let modeIndex = 0; modeIndex < modes.length; modeIndex += 1) {
    const mode = modes[modeIndex];
    if (mode === undefined) {
      continue;
    }
    const order = rotateVariants(round + modeIndex);
    for (let orderIndex = 0; orderIndex < order.length; orderIndex += 1) {
      const variant = order[orderIndex];
      if (variant === undefined) {
        continue;
      }
      console.error(
        `[benchmark] round ${round + 1}/${options.rounds} ${mode} ${variant}`,
      );
      samples.push(
        await runSample(
          mode,
          variant,
          options.profile,
          options.seed,
          round,
          orderIndex,
          inputPath,
          manifest,
        ),
      );
    }
  }
}

const createdAt = new Date().toISOString();
const runId = `dev-${options.profile}-${createdAt.replaceAll(":", "-")}`;
const cpuInfo = cpus();
const hostActivityAfter = readHostActivitySnapshot();
const containerLimits = await readContainerLimits(executionEnvironment);
const run = BenchmarkRunSchema.parse({
  schemaVersion: 3,
  development: true,
  runId,
  createdAt,
  profile: options.profile,
  validationEnvelope: profile.validationEnvelope,
  maximumReports: profile.maximumReports,
  seed: options.seed,
  rounds: options.rounds,
  modes,
  command: `bun run benchmark --profile ${options.profile} --seed ${options.seed} --rounds ${options.rounds} --mode ${options.mode}`,
  correctnessGate: {
    status: "pass",
    command: "bun run test",
  },
  environment: {
    executionEnvironment,
    platform: process.platform,
    architecture: process.arch,
    cpuModel: cpuInfo[0]?.model ?? "unknown",
    logicalCpuCount: cpuInfo.length,
    totalMemoryBytes: totalmem(),
    bunVersion: Bun.version,
    versions: {
      hono: "4.12.11",
      zod: "4.4.3",
      zodCompiler: "1.23.6",
      ajv: "8.18.0",
      typebox: "1.3.11",
      valibot: "1.4.2",
      typescript: "6.0.2",
    },
    gitRevision: readGitRevision(),
    powerMode: readPowerMode(),
    machineIdle: null,
    hostActivityBefore,
    hostActivityAfter,
    containerLimits,
  },
  samples,
});
const resultDirectory = resolve("results", runId);
await mkdir(resultDirectory, { recursive: true });
await Promise.all([
  writeFile(
    join(resultDirectory, "raw.json"),
    `${JSON.stringify(run, null, 2)}\n`,
    "utf8",
  ),
  writeFile(
    join(resultDirectory, "summary.md"),
    summarizeBenchmarkRun(run),
    "utf8",
  ),
  copyFile(manifestPath, join(resultDirectory, "manifest.json")),
  copyFile(
    resolve("dist/compiled-zod-external/build-diagnostics.json"),
    join(resultDirectory, "compiled-build-diagnostics.json"),
  ),
  copyFile(
    resolve("dist/compiled-zod-manual-normalizer/build-diagnostics.json"),
    join(
      resultDirectory,
      "compiled-manual-normalizer-build-diagnostics.json",
    ),
  ),
  copyFile(
    resolve("dist/compiled-zod-bundled/compatibility.json"),
    join(resultDirectory, "compiled-bundled-compatibility.json"),
  ),
]);

console.log(
  JSON.stringify({
    status: "pass",
    development: true,
    runId,
    sampleCount: samples.length,
    resultDirectory: relativeResultDirectory(resultDirectory),
  }),
);

function relativeResultDirectory(absolutePath: string): string {
  const prefix = `${process.cwd()}/`;
  return absolutePath.startsWith(prefix)
    ? absolutePath.slice(prefix.length)
    : absolutePath;
}
