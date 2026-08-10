import { z } from "zod";
import { BenchmarkSampleSchema } from "./result-schema";
import { ValidatorNameSchema } from "../validators/registry";

export const MemoryTraceObservationSchema = z.strictObject({
  elapsedNanoseconds: z.number().int().nonnegative(),
  cgroupCurrentBytes: z.number().int().nonnegative(),
  processRssBytes: z.number().int().nonnegative().nullable(),
  processHighWaterRssBytes: z.number().int().nonnegative().nullable(),
  processPssBytes: z.number().int().nonnegative().nullable(),
  processPrivateBytes: z.number().int().nonnegative().nullable(),
});
export type MemoryTraceObservation = z.infer<
  typeof MemoryTraceObservationSchema
>;

export const DockerMemorySampleSchema = z.strictObject({
  schemaVersion: z.literal(1),
  development: z.literal(true),
  variant: ValidatorNameSchema,
  round: z.number().int().nonnegative(),
  order: z.number().int().nonnegative(),
  samplingIntervalMilliseconds: z.number().int().positive(),
  smapsSamplingIntervalMilliseconds: z.number().int().positive(),
  observationCount: z.number().int().positive(),
  cgroupMemoryLimitBytes: z.number().int().positive(),
  cgroupSwapLimitBytes: z.number().int().nonnegative(),
  cgroupBaselineBytes: z.number().int().nonnegative(),
  cgroupPeakBytes: z.number().int().nonnegative(),
  sampledCgroupPeakBytes: z.number().int().nonnegative(),
  sampledProcessRssPeakBytes: z.number().int().nonnegative(),
  processHighWaterRssPeakBytes: z.number().int().nonnegative(),
  sampledProcessPssPeakBytes: z.number().int().nonnegative(),
  sampledProcessPrivatePeakBytes: z.number().int().nonnegative(),
  cgroupOomEvents: z.number().int().nonnegative(),
  cgroupOomKillEvents: z.number().int().nonnegative(),
  benchmark: BenchmarkSampleSchema,
  observations: z.array(MemoryTraceObservationSchema).min(1),
});
export type DockerMemorySample = z.infer<typeof DockerMemorySampleSchema>;

export const DockerMemoryRunSchema = z.strictObject({
  schemaVersion: z.literal(1),
  development: z.literal(true),
  kind: z.literal("per-container-validator-memory"),
  runId: z.string().min(1),
  createdAt: z.string().datetime(),
  profile: z.literal("diagnostic-10000"),
  seed: z.number().int().min(0).max(0xffff_ffff),
  rounds: z.number().int().positive(),
  samplingIntervalMilliseconds: z.number().int().positive(),
  inputBytes: z.number().int().positive(),
  inputSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  dockerImage: z.string().min(1),
  dockerImageId: z.string().min(1),
  cpuLimit: z.number().positive(),
  memoryLimitBytes: z.number().int().positive(),
  swapLimitBytes: z.number().int().nonnegative(),
  processLimit: z.number().int().positive(),
  samples: z.array(DockerMemorySampleSchema).min(1),
});
export type DockerMemoryRun = z.infer<typeof DockerMemoryRunSchema>;
