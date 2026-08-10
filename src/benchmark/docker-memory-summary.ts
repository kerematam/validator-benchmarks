import type {
  DockerMemoryRun,
  DockerMemorySample,
} from "./docker-memory-schema";
import {
  ValidatorNameSchema,
  type ValidatorName,
} from "../validators/registry";

interface Distribution {
  readonly minimum: number;
  readonly median: number;
  readonly maximum: number;
}

function distribution(values: readonly number[]): Distribution {
  const sorted = [...values].sort((left, right) => left - right);
  if (sorted.length === 0) {
    throw new Error("Cannot summarize an empty memory sample group");
  }
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 1
      ? sorted[middle]
      : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
  return {
    minimum: sorted[0] ?? 0,
    median: median ?? 0,
    maximum: sorted.at(-1) ?? 0,
  };
}

function milliseconds(nanoseconds: number): string {
  return (nanoseconds / 1_000_000).toFixed(3);
}

function mebibytes(bytes: number): string {
  return (bytes / 1_048_576).toFixed(1);
}

function nonnegativeDelta(after: number, before: number): number {
  return Math.max(0, after - before);
}

function samplesFor(
  run: DockerMemoryRun,
  variant: ValidatorName,
): readonly DockerMemorySample[] {
  return run.samples.filter((sample) => sample.variant === variant);
}

export function summarizeDockerMemoryRun(run: DockerMemoryRun): string {
  const variants = ValidatorNameSchema.options;
  const lines = [
    "# Per-container validator memory diagnostic",
    "",
    "> Development diagnostic. Each sample uses a fresh Docker cgroup; no samples are retried or discarded.",
    "",
    `- Run: \`${run.runId}\``,
    `- Profile: \`${run.profile}\` (${run.inputBytes} bytes)`,
    `- Seed: \`${run.seed}\``,
    `- Fresh containers per variant: ${run.rounds}`,
    `- RSS/cgroup sampling interval target: ${run.samplingIntervalMilliseconds} ms`,
    `- PSS/private sampling interval target: ${run.samples[0]?.smapsSamplingIntervalMilliseconds ?? "n/a"} ms`,
    `- Container limits: ${run.cpuLimit} CPUs, ${mebibytes(run.memoryLimitBytes)} MiB RAM, ${mebibytes(run.swapLimitBytes)} MiB swap, ${run.processLimit} processes`,
    `- Image: \`${run.dockerImageId}\``,
    "",
    "The target-process metrics exclude the sampler process. Cgroup metrics include both the small sampler parent and its measured Bun child. `memory.peak` is kernel-maintained and resets with every container.",
    "",
    "## Distribution summary",
    "",
    "| Variant | Validation median (ms) | Process HWM min / median / max (MiB) | Sampled RSS peak median (MiB) | Sampled PSS peak median (MiB) | Sampled private peak median (MiB) | Cgroup peak min / median / max (MiB) | Cgroup incremental peak median (MiB) | Window HWM increase median (MiB) |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];

  for (const variant of variants) {
    const samples = samplesFor(run, variant);
    const duration = distribution(
      samples.map((sample) => sample.benchmark.primaryNanoseconds),
    );
    const processHwm = distribution(
      samples.map((sample) => sample.processHighWaterRssPeakBytes),
    );
    const sampledRss = distribution(
      samples.map((sample) => sample.sampledProcessRssPeakBytes),
    );
    const sampledPss = distribution(
      samples.map((sample) => sample.sampledProcessPssPeakBytes),
    );
    const sampledPrivate = distribution(
      samples.map((sample) => sample.sampledProcessPrivatePeakBytes),
    );
    const cgroupPeak = distribution(
      samples.map((sample) => sample.cgroupPeakBytes),
    );
    const cgroupIncremental = distribution(
      samples.map((sample) =>
        nonnegativeDelta(sample.cgroupPeakBytes, sample.cgroupBaselineBytes),
      ),
    );
    const windowHwm = distribution(
      samples.map((sample) =>
        nonnegativeDelta(
          sample.benchmark.resourceUsageAfter.maximumResidentSetSizeBytes,
          sample.benchmark.resourceUsageBefore.maximumResidentSetSizeBytes,
        ),
      ),
    );
    lines.push(
      `| ${variant} | ${milliseconds(duration.median)} | ${mebibytes(processHwm.minimum)} / ${mebibytes(processHwm.median)} / ${mebibytes(processHwm.maximum)} | ${mebibytes(sampledRss.median)} | ${mebibytes(sampledPss.median)} | ${mebibytes(sampledPrivate.median)} | ${mebibytes(cgroupPeak.minimum)} / ${mebibytes(cgroupPeak.median)} / ${mebibytes(cgroupPeak.maximum)} | ${mebibytes(cgroupIncremental.median)} | ${mebibytes(windowHwm.median)} |`,
    );
  }

  lines.push(
    "",
    "## Individual samples",
    "",
    "| Round | Order | Variant | Validation (ms) | Observations | Process HWM (MiB) | Sampled RSS peak (MiB) | Sampled PSS peak (MiB) | Sampled private peak (MiB) | Cgroup baseline (MiB) | Cgroup peak (MiB) | Cgroup incremental peak (MiB) | OOM / kills |",
    "| ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  );
  for (const sample of run.samples) {
    lines.push(
      `| ${sample.round + 1} | ${sample.order + 1} | ${sample.variant} | ${milliseconds(sample.benchmark.primaryNanoseconds)} | ${sample.observationCount} | ${mebibytes(sample.processHighWaterRssPeakBytes)} | ${mebibytes(sample.sampledProcessRssPeakBytes)} | ${mebibytes(sample.sampledProcessPssPeakBytes)} | ${mebibytes(sample.sampledProcessPrivatePeakBytes)} | ${mebibytes(sample.cgroupBaselineBytes)} | ${mebibytes(sample.cgroupPeakBytes)} | ${mebibytes(nonnegativeDelta(sample.cgroupPeakBytes, sample.cgroupBaselineBytes))} | ${sample.cgroupOomEvents} / ${sample.cgroupOomKillEvents} |`,
    );
  }
  return `${lines.join("\n")}\n`;
}
