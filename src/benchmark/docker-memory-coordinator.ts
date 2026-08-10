import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import {
  DockerMemoryRunSchema,
  DockerMemorySampleSchema,
  type DockerMemorySample,
} from "./docker-memory-schema";
import { summarizeDockerMemoryRun } from "./docker-memory-summary";
import {
  ValidatorNameSchema,
  type ValidatorName,
} from "../validators/registry";

const ArgumentsSchema = z.strictObject({
  rounds: z.coerce.number().int().min(1).max(100).default(10),
  samplingIntervalMilliseconds: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(5),
  seed: z.coerce.number().int().min(0).max(0xffff_ffff).default(20_260_807),
});

const DOCKER_IMAGE = "structured-report-validation-benchmark:bun-1.3.14";
const MEMORY_LIMIT_BYTES = 2_147_483_648;
const PROCESS_LIMIT = 256;
const CPU_LIMIT = 4;

function readArguments(argumentsToParse: readonly string[]): unknown {
  const values: Record<string, string> = {};
  for (let index = 0; index < argumentsToParse.length; index += 1) {
    const flag = argumentsToParse[index];
    if (
      flag !== "--rounds" &&
      flag !== "--sampling-interval-ms" &&
      flag !== "--seed"
    ) {
      throw new Error(
        `Unknown Docker memory coordinator argument at position ${index + 1}`,
      );
    }
    const value = argumentsToParse[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(
        `Missing Docker memory coordinator value at position ${index + 1}`,
      );
    }
    values[flag] = value;
    index += 1;
  }
  return {
    rounds: values["--rounds"],
    samplingIntervalMilliseconds: values["--sampling-interval-ms"],
    seed: values["--seed"],
  };
}

async function runCommand(
  command: string[],
  description: string,
): Promise<{ readonly stdout: string; readonly stderr: string }> {
  const child = Bun.spawn(command, { stdout: "pipe", stderr: "pipe" });
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  if (exitCode !== 0) {
    throw new Error(
      `${description} failed: ${(stderr.trim() || stdout.trim()).slice(0, 4_000)}`,
    );
  }
  return { stdout, stderr };
}

function readId(flag: "-u" | "-g"): string {
  const result = Bun.spawnSync({
    cmd: ["id", flag],
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    throw new Error(`Could not read host id ${flag}`);
  }
  const value = new TextDecoder().decode(result.stdout).trim();
  if (!/^[0-9]+$/u.test(value)) {
    throw new Error(`Host id ${flag} was invalid`);
  }
  return value;
}

function dockerRunPrefix(root: string, uid: string, gid: string): string[] {
  return [
    "docker",
    "run",
    "--rm",
    "--network",
    "none",
    "--cpus",
    String(CPU_LIMIT),
    "--memory",
    "2g",
    "--memory-swap",
    "2g",
    "--pids-limit",
    String(PROCESS_LIMIT),
    "--user",
    `${uid}:${gid}`,
    "--volume",
    `${root}:/workspace`,
    "--workdir",
    "/workspace",
    DOCKER_IMAGE,
  ];
}

const MEMORY_VARIANTS = ValidatorNameSchema.options;

function orderForRound(round: number): readonly ValidatorName[] {
  return MEMORY_VARIANTS.flatMap((_, index) => {
    const variant = MEMORY_VARIANTS[(index + round) % MEMORY_VARIANTS.length];
    return variant === undefined ? [] : [variant];
  });
}

const argumentsResult = ArgumentsSchema.safeParse(
  readArguments(Bun.argv.slice(2)),
);
if (!argumentsResult.success) {
  throw new Error("Docker memory coordinator arguments are invalid");
}
const options = argumentsResult.data;
const root = process.cwd();
const uid = readId("-u");
const gid = readId("-g");

console.error("[docker-memory] building pinned diagnostic image");
await runCommand(
  [
    "docker",
    "build",
    "--file",
    resolve(root, "docker/benchmark.Dockerfile"),
    "--tag",
    DOCKER_IMAGE,
    root,
  ],
  "Docker image build",
);
const runPrefix = dockerRunPrefix(root, uid, gid);

console.error("[docker-memory] running correctness gate");
await runCommand(
  [...runPrefix, "bun", "run", "test"],
  "Container correctness gate",
);
console.error("[docker-memory] generating deterministic input");
await runCommand(
  [
    ...runPrefix,
    "bun",
    "run",
    "generate",
    "--profile",
    "diagnostic-10000",
    "--seed",
    String(options.seed),
  ],
  "Container generator gate",
);
await runCommand(
  [...runPrefix, "bun", "run", "privacy:audit"],
  "Container privacy gate",
);
const imageInspection = await runCommand(
  ["docker", "image", "inspect", "--format", "{{.Id}}", DOCKER_IMAGE],
  "Docker image inspection",
);
const dockerImageId = imageInspection.stdout.trim();
if (!dockerImageId) {
  throw new Error("Docker image inspection returned no image id");
}

const inputPath = `.generated/diagnostic-10000-seed-${options.seed}/request.json`;
const samples: DockerMemorySample[] = [];
for (let round = 0; round < options.rounds; round += 1) {
  const order = orderForRound(round);
  for (let orderIndex = 0; orderIndex < order.length; orderIndex += 1) {
    const variant = order[orderIndex];
    if (variant === undefined) {
      continue;
    }
    console.error(
      `[docker-memory] round ${round + 1}/${options.rounds} ${variant}`,
    );
    const result = await runCommand(
      [
        ...runPrefix,
        "bun",
        "run",
        "src/benchmark/docker-memory-sample.ts",
        "--variant",
        variant,
        "--round",
        String(round),
        "--order",
        String(orderIndex),
        "--seed",
        String(options.seed),
        "--input",
        inputPath,
        "--sampling-interval-ms",
        String(options.samplingIntervalMilliseconds),
      ],
      `Docker memory sample ${round + 1}/${variant}`,
    );
    const sampleInput: unknown = JSON.parse(result.stdout);
    const sample = DockerMemorySampleSchema.parse(sampleInput);
    if (
      sample.variant !== variant ||
      sample.round !== round ||
      sample.order !== orderIndex ||
      sample.benchmark.outputReportCount !== 10_000 ||
      sample.cgroupOomEvents !== 0 ||
      sample.cgroupOomKillEvents !== 0
    ) {
      throw new Error(`Docker memory sample ${round + 1}/${variant} failed its gate`);
    }
    samples.push(sample);
  }
}

const firstSample = samples[0];
if (firstSample === undefined) {
  throw new Error("Docker memory coordinator produced no samples");
}
for (const sample of samples) {
  if (
    sample.benchmark.inputBytes !== firstSample.benchmark.inputBytes ||
    sample.benchmark.inputSha256 !== firstSample.benchmark.inputSha256
  ) {
    throw new Error("Docker memory samples did not use identical input bytes");
  }
}

const createdAt = new Date().toISOString();
const runId = `dev-diagnostic-10000-docker-validator-memory-${createdAt.replaceAll(":", "-")}`;
const run = DockerMemoryRunSchema.parse({
  schemaVersion: 1,
  development: true,
  kind: "per-container-validator-memory",
  runId,
  createdAt,
  profile: "diagnostic-10000",
  seed: options.seed,
  rounds: options.rounds,
  samplingIntervalMilliseconds: options.samplingIntervalMilliseconds,
  inputBytes: firstSample.benchmark.inputBytes,
  inputSha256: firstSample.benchmark.inputSha256,
  dockerImage: DOCKER_IMAGE,
  dockerImageId,
  cpuLimit: CPU_LIMIT,
  memoryLimitBytes: MEMORY_LIMIT_BYTES,
  swapLimitBytes: 0,
  processLimit: PROCESS_LIMIT,
  samples,
});
const resultDirectory = resolve("results", runId);
await mkdir(resultDirectory, { recursive: true });
await Promise.all([
  writeFile(
    resolve(resultDirectory, "raw.json"),
    `${JSON.stringify(run, null, 2)}\n`,
    "utf8",
  ),
  writeFile(
    resolve(resultDirectory, "summary.md"),
    summarizeDockerMemoryRun(run),
    "utf8",
  ),
]);
console.log(
  JSON.stringify({
    status: "pass",
    development: true,
    runId,
    sampleCount: samples.length,
    resultDirectory: resultDirectory.startsWith(`${root}/`)
      ? resultDirectory.slice(root.length + 1)
      : resultDirectory,
  }),
);
