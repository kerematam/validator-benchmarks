import { z } from "zod";
import { SyntheticProfileNameSchema } from "../generator/profiles";
import { ValidatorNameSchema } from "../validators/registry";

export const BenchmarkModeSchema = z.enum(["validator", "http"]);
export type BenchmarkMode = z.infer<typeof BenchmarkModeSchema>;

export const MemorySnapshotSchema = z.strictObject({
  rss: z.number().int().nonnegative(),
  heapUsed: z.number().int().nonnegative(),
  heapTotal: z.number().int().nonnegative(),
  external: z.number().int().nonnegative(),
  arrayBuffers: z.number().int().nonnegative(),
});

export const ResourceUsageSnapshotSchema = z.strictObject({
  userCpuNanoseconds: z.number().int().nonnegative(),
  systemCpuNanoseconds: z.number().int().nonnegative(),
  maximumResidentSetSizeBytes: z.number().int().nonnegative(),
  minorPageFaults: z.number().int().nonnegative(),
  majorPageFaults: z.number().int().nonnegative(),
  swaps: z.number().int().nonnegative(),
  filesystemReadOperations: z.number().int().nonnegative(),
  filesystemWriteOperations: z.number().int().nonnegative(),
  ipcMessagesSent: z.number().int().nonnegative(),
  ipcMessagesReceived: z.number().int().nonnegative(),
  signals: z.number().int().nonnegative(),
  voluntaryContextSwitches: z.number().int().nonnegative(),
  involuntaryContextSwitches: z.number().int().nonnegative(),
});

export const HostActivitySnapshotSchema = z.strictObject({
  capturedAt: z.string().datetime(),
  loadAverage1Minute: z.number().nonnegative(),
  loadAverage5Minutes: z.number().nonnegative(),
  loadAverage15Minutes: z.number().nonnegative(),
  aggregateCpuPercent: z.number().nonnegative().nullable(),
  busyProcessCount: z.number().int().nonnegative().nullable(),
});

export const ContainerLimitsSchema = z.strictObject({
  memoryLimitBytes: z.number().int().positive().nullable(),
  swapLimitBytes: z.number().int().nonnegative().nullable(),
  wholeRunMemoryPeakBytes: z.number().int().nonnegative().nullable(),
  memoryCurrentAtResultBytes: z.number().int().nonnegative().nullable(),
  cpuQuotaCores: z.number().positive().nullable(),
  cpusetCpus: z.string().regex(/^[0-9,-]+$/u).nullable(),
  processLimit: z.number().int().positive().nullable(),
});

export const BenchmarkSampleSchema = z.strictObject({
  schemaVersion: z.literal(3),
  development: z.literal(true),
  mode: BenchmarkModeSchema,
  primaryMetric: z.enum([
    "validation-and-normalization",
    "http-round-trip",
  ]),
  variant: ValidatorNameSchema,
  profile: SyntheticProfileNameSchema,
  validationEnvelope: z.enum(["production", "diagnostic"]),
  maximumReports: z.number().int().positive(),
  seed: z.number().int().min(0).max(0xffff_ffff),
  round: z.number().int().nonnegative(),
  order: z.number().int().nonnegative(),
  processId: z.number().int().positive(),
  inputBytes: z.number().int().positive(),
  inputSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  jsonParseNanoseconds: z.number().int().nonnegative().nullable(),
  primaryNanoseconds: z.number().int().nonnegative(),
  responseStatus: z.number().int().min(100).max(599).nullable(),
  outputReportCount: z.number().int().nonnegative(),
  memoryBefore: MemorySnapshotSchema,
  memoryAfter: MemorySnapshotSchema,
  resourceUsageBefore: ResourceUsageSnapshotSchema,
  resourceUsageAfter: ResourceUsageSnapshotSchema,
  osPeakRssBytes: z.number().int().nonnegative().nullable(),
});

export type BenchmarkSample = z.infer<typeof BenchmarkSampleSchema>;

export const BenchmarkRunSchema = z.strictObject({
  schemaVersion: z.literal(3),
  development: z.literal(true),
  runId: z.string().min(1),
  createdAt: z.string().datetime(),
  profile: SyntheticProfileNameSchema,
  validationEnvelope: z.enum(["production", "diagnostic"]),
  maximumReports: z.number().int().positive(),
  seed: z.number().int().min(0).max(0xffff_ffff),
  rounds: z.number().int().positive(),
  modes: z.array(BenchmarkModeSchema).min(1),
  command: z.string().min(1),
  correctnessGate: z.strictObject({
    status: z.literal("pass"),
    command: z.literal("bun run test"),
  }),
  environment: z.strictObject({
    executionEnvironment: z.enum(["native-host", "docker"]),
    platform: z.string().min(1),
    architecture: z.string().min(1),
    cpuModel: z.string().min(1),
    logicalCpuCount: z.number().int().positive(),
    totalMemoryBytes: z.number().int().positive(),
    bunVersion: z.literal("1.3.14"),
    versions: z.strictObject({
      hono: z.literal("4.12.11"),
      zod: z.literal("4.4.3"),
      zodCompiler: z.literal("1.23.6"),
      ajv: z.literal("8.18.0"),
      typebox: z.literal("1.3.11"),
      valibot: z.literal("1.4.2"),
      typescript: z.literal("6.0.2"),
    }),
    gitRevision: z.string().nullable(),
    powerMode: z.string().nullable(),
    machineIdle: z.boolean().nullable().default(null),
    hostActivityBefore: HostActivitySnapshotSchema,
    hostActivityAfter: HostActivitySnapshotSchema,
    containerLimits: ContainerLimitsSchema.nullable(),
  }),
  samples: z.array(BenchmarkSampleSchema).min(1),
});

export type BenchmarkRun = z.infer<typeof BenchmarkRunSchema>;
