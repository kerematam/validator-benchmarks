import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ValidatorName } from "../validators/registry";
import {
  BenchmarkRunSchema,
  type BenchmarkMode,
  type BenchmarkRun,
  type BenchmarkSample,
} from "./result-schema";

interface Distribution {
  readonly count: number;
  readonly minimum: number;
  readonly p25: number;
  readonly median: number;
  readonly p75: number;
  readonly maximum: number;
  readonly interquartileRange: number;
  readonly p95?: number;
}

interface SummaryGroup {
  readonly mode: BenchmarkMode;
  readonly variant: ValidatorName;
  readonly primaryNanoseconds: Distribution;
  readonly jsonParseNanoseconds: Distribution | null;
  readonly osPeakRssBytes: Distribution | null;
  readonly rssBeforeBytes: Distribution;
  readonly rssAfterBytes: Distribution;
  readonly rssChangeBytes: Distribution;
  readonly highWaterRssIncreaseBytes: Distribution;
  readonly heapUsedChangeBytes: Distribution;
  readonly heapTotalChangeBytes: Distribution;
  readonly externalChangeBytes: Distribution;
  readonly arrayBuffersChangeBytes: Distribution;
  readonly userCpuNanoseconds: Distribution;
  readonly systemCpuNanoseconds: Distribution;
  readonly minorPageFaults: Distribution;
  readonly majorPageFaults: Distribution;
  readonly voluntaryContextSwitches: Distribution;
  readonly involuntaryContextSwitches: Distribution;
  readonly filesystemReadOperations: Distribution;
  readonly filesystemWriteOperations: Distribution;
}

function quantile(sorted: readonly number[], probability: number): number {
  if (sorted.length === 0) {
    throw new Error("Cannot calculate a quantile for an empty sample");
  }
  if (sorted.length === 1) {
    return sorted[0] ?? 0;
  }

  const index = (sorted.length - 1) * probability;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const lower = sorted[lowerIndex];
  const upper = sorted[upperIndex];
  if (lower === undefined || upper === undefined) {
    throw new Error("Quantile index was outside the sample");
  }
  return lower + (upper - lower) * (index - lowerIndex);
}

function distribution(values: readonly number[]): Distribution {
  const sorted = [...values].sort((left, right) => left - right);
  if (sorted.length === 0) {
    throw new Error("Cannot summarize an empty sample");
  }
  const p25 = quantile(sorted, 0.25);
  const p75 = quantile(sorted, 0.75);
  const base = {
    count: sorted.length,
    minimum: sorted[0] ?? 0,
    p25,
    median: quantile(sorted, 0.5),
    p75,
    maximum: sorted.at(-1) ?? 0,
    interquartileRange: p75 - p25,
  };
  return sorted.length >= 20 ? { ...base, p95: quantile(sorted, 0.95) } : base;
}

function nonnegativeDelta(after: number, before: number): number {
  return Math.max(0, after - before);
}

function groupSamples(run: BenchmarkRun): readonly SummaryGroup[] {
  const groups = new Map<string, BenchmarkSample[]>();
  for (const sample of run.samples) {
    const key = `${sample.mode}:${sample.variant}`;
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, [sample]);
    } else {
      group.push(sample);
    }
  }

  return [...groups.values()].map((samples) => {
    const first = samples[0];
    if (first === undefined) {
      throw new Error("Benchmark summary encountered an empty group");
    }
    const parseValues = samples.flatMap((sample) =>
      sample.jsonParseNanoseconds === null
        ? []
        : [sample.jsonParseNanoseconds],
    );
    const peakValues = samples.flatMap((sample) =>
      sample.osPeakRssBytes === null ? [] : [sample.osPeakRssBytes],
    );
    return {
      mode: first.mode,
      variant: first.variant,
      primaryNanoseconds: distribution(
        samples.map((sample) => sample.primaryNanoseconds),
      ),
      jsonParseNanoseconds:
        parseValues.length > 0 ? distribution(parseValues) : null,
      osPeakRssBytes: peakValues.length > 0 ? distribution(peakValues) : null,
      rssBeforeBytes: distribution(
        samples.map((sample) => sample.memoryBefore.rss),
      ),
      rssAfterBytes: distribution(
        samples.map((sample) => sample.memoryAfter.rss),
      ),
      rssChangeBytes: distribution(
        samples.map(
          (sample) => sample.memoryAfter.rss - sample.memoryBefore.rss,
        ),
      ),
      highWaterRssIncreaseBytes: distribution(
        samples.map((sample) =>
          nonnegativeDelta(
            sample.resourceUsageAfter.maximumResidentSetSizeBytes,
            sample.resourceUsageBefore.maximumResidentSetSizeBytes,
          ),
        ),
      ),
      heapUsedChangeBytes: distribution(
        samples.map(
          (sample) =>
            sample.memoryAfter.heapUsed - sample.memoryBefore.heapUsed,
        ),
      ),
      heapTotalChangeBytes: distribution(
        samples.map(
          (sample) =>
            sample.memoryAfter.heapTotal - sample.memoryBefore.heapTotal,
        ),
      ),
      externalChangeBytes: distribution(
        samples.map(
          (sample) =>
            sample.memoryAfter.external - sample.memoryBefore.external,
        ),
      ),
      arrayBuffersChangeBytes: distribution(
        samples.map(
          (sample) =>
            sample.memoryAfter.arrayBuffers - sample.memoryBefore.arrayBuffers,
        ),
      ),
      userCpuNanoseconds: distribution(
        samples.map((sample) =>
          nonnegativeDelta(
            sample.resourceUsageAfter.userCpuNanoseconds,
            sample.resourceUsageBefore.userCpuNanoseconds,
          ),
        ),
      ),
      systemCpuNanoseconds: distribution(
        samples.map((sample) =>
          nonnegativeDelta(
            sample.resourceUsageAfter.systemCpuNanoseconds,
            sample.resourceUsageBefore.systemCpuNanoseconds,
          ),
        ),
      ),
      minorPageFaults: distribution(
        samples.map((sample) =>
          nonnegativeDelta(
            sample.resourceUsageAfter.minorPageFaults,
            sample.resourceUsageBefore.minorPageFaults,
          ),
        ),
      ),
      majorPageFaults: distribution(
        samples.map((sample) =>
          nonnegativeDelta(
            sample.resourceUsageAfter.majorPageFaults,
            sample.resourceUsageBefore.majorPageFaults,
          ),
        ),
      ),
      voluntaryContextSwitches: distribution(
        samples.map((sample) =>
          nonnegativeDelta(
            sample.resourceUsageAfter.voluntaryContextSwitches,
            sample.resourceUsageBefore.voluntaryContextSwitches,
          ),
        ),
      ),
      involuntaryContextSwitches: distribution(
        samples.map((sample) =>
          nonnegativeDelta(
            sample.resourceUsageAfter.involuntaryContextSwitches,
            sample.resourceUsageBefore.involuntaryContextSwitches,
          ),
        ),
      ),
      filesystemReadOperations: distribution(
        samples.map((sample) =>
          nonnegativeDelta(
            sample.resourceUsageAfter.filesystemReadOperations,
            sample.resourceUsageBefore.filesystemReadOperations,
          ),
        ),
      ),
      filesystemWriteOperations: distribution(
        samples.map((sample) =>
          nonnegativeDelta(
            sample.resourceUsageAfter.filesystemWriteOperations,
            sample.resourceUsageBefore.filesystemWriteOperations,
          ),
        ),
      ),
    };
  });
}

function milliseconds(nanoseconds: number): string {
  return (nanoseconds / 1_000_000).toFixed(3);
}

function mebibytes(bytes: number): string {
  return (bytes / 1_048_576).toFixed(1);
}

export function summarizeBenchmarkRun(run: BenchmarkRun): string {
  const groups = groupSamples(run);
  const lines = [
    "# Development benchmark summary",
    "",
    "> Non-public smoke/development output. Do not use these samples for performance claims.",
    "",
    `- Run: \`${run.runId}\``,
    `- Profile: \`${run.profile}\` (${run.samples[0]?.inputBytes ?? 0} bytes)`,
    `- Validation envelope: \`${run.validationEnvelope}\` (maximum ${run.maximumReports} reports)`,
    `- Seed: \`${run.seed}\``,
    `- Fresh-process rounds per mode/variant: ${run.rounds}`,
    `- Command: \`${run.command}\``,
    `- Bun: ${run.environment.bunVersion}; Hono: ${run.environment.versions.hono}`,
    `- Execution environment: ${run.environment.executionEnvironment}`,
    `- Container limits: ${run.environment.containerLimits === null ? "n/a" : `${run.environment.containerLimits.cpuQuotaCores ?? "unlimited"} CPUs, ${run.environment.containerLimits.memoryLimitBytes === null ? "unlimited memory" : `${mebibytes(run.environment.containerLimits.memoryLimitBytes)} MiB memory`}, ${run.environment.containerLimits.swapLimitBytes === null ? "unlimited swap" : `${mebibytes(run.environment.containerLimits.swapLimitBytes)} MiB swap`}, ${run.environment.containerLimits.processLimit ?? "unlimited"} processes`}`,
    `- Container whole-run memory peak: ${run.environment.containerLimits?.wholeRunMemoryPeakBytes === null || run.environment.containerLimits?.wholeRunMemoryPeakBytes === undefined ? "n/a" : `${mebibytes(run.environment.containerLimits.wholeRunMemoryPeakBytes)} MiB`}`,
    `- Machine-idle assertion: ${run.environment.machineIdle === null ? "not asserted" : String(run.environment.machineIdle)}`,
    `- Host load average before: ${run.environment.hostActivityBefore.loadAverage1Minute.toFixed(2)}, ${run.environment.hostActivityBefore.loadAverage5Minutes.toFixed(2)}, ${run.environment.hostActivityBefore.loadAverage15Minutes.toFixed(2)}`,
    `- Host load average after: ${run.environment.hostActivityAfter.loadAverage1Minute.toFixed(2)}, ${run.environment.hostActivityAfter.loadAverage5Minutes.toFixed(2)}, ${run.environment.hostActivityAfter.loadAverage15Minutes.toFixed(2)}`,
    "",
    "Quantiles use linear interpolation. P95 is omitted for groups with fewer than 20 samples.",
    "Host activity is observational metadata, not proof that unrelated host work was absent.",
    "",
    "## Primary duration",
    "",
    "| Mode | Variant | Samples | Min (ms) | P25 (ms) | Median (ms) | P75 (ms) | Max (ms) | IQR (ms) |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];

  for (const group of groups) {
    const stats = group.primaryNanoseconds;
    lines.push(
      `| ${group.mode} | ${group.variant} | ${stats.count} | ${milliseconds(stats.minimum)} | ${milliseconds(stats.p25)} | ${milliseconds(stats.median)} | ${milliseconds(stats.p75)} | ${milliseconds(stats.maximum)} | ${milliseconds(stats.interquartileRange)} |`,
    );
  }

  lines.push(
    "",
    "Validator mode measures validation and normalization from an already parsed value. HTTP mode measures a complete loopback request through Bun.serve and Hono, including server-side JSON decoding and response consumption.",
    "",
    "## JSON.parse duration",
    "",
    "This decode timer is recorded separately in validator-mode children and is excluded from the primary validator timer.",
    "",
    "| Variant | Samples | Min (ms) | Median (ms) | Max (ms) |",
    "| --- | ---: | ---: | ---: | ---: |",
  );
  for (const group of groups) {
    const stats = group.jsonParseNanoseconds;
    if (stats !== null) {
      lines.push(
        `| ${group.variant} | ${stats.count} | ${milliseconds(stats.minimum)} | ${milliseconds(stats.median)} | ${milliseconds(stats.maximum)} |`,
      );
    }
  }

  lines.push(
    "",
    "## OS-observed peak RSS",
    "",
    "The whole-child peak includes module setup, input decoding, validation, and result serialization. The measured-window high-water increase is the change in the process high-water mark between snapshots immediately before and after the primary timer; zero means the operation did not exceed an earlier process peak.",
    "",
    "| Mode | Variant | Samples | Whole-child peak median (MiB) | Whole-child peak max (MiB) | Measured-window high-water increase median (MiB) |",
    "| --- | --- | ---: | ---: | ---: | ---: |",
  );
  for (const group of groups) {
    const stats = group.osPeakRssBytes;
    lines.push(
      stats === null
        ? `| ${group.mode} | ${group.variant} | ${group.highWaterRssIncreaseBytes.count} | n/a | n/a | ${mebibytes(group.highWaterRssIncreaseBytes.median)} |`
        : `| ${group.mode} | ${group.variant} | ${stats.count} | ${mebibytes(stats.median)} | ${mebibytes(stats.maximum)} | ${mebibytes(group.highWaterRssIncreaseBytes.median)} |`,
    );
  }

  lines.push(
    "",
    "## In-process RSS change",
    "",
    "The before/after deltas keep the request text, parsed input, and validated result reachable. They show retained process and JavaScript-managed memory, not a sampled transient peak. Component deltas can still be negative when the runtime releases backing storage or changes allocator accounting.",
    "",
    "| Mode | Variant | RSS before median (MiB) | RSS after median (MiB) | RSS delta median (MiB) | Heap used delta median (MiB) | Heap capacity delta median (MiB) | External delta median (MiB) | ArrayBuffer delta median (MiB) |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  );
  for (const group of groups) {
    lines.push(
      `| ${group.mode} | ${group.variant} | ${mebibytes(group.rssBeforeBytes.median)} | ${mebibytes(group.rssAfterBytes.median)} | ${mebibytes(group.rssChangeBytes.median)} | ${mebibytes(group.heapUsedChangeBytes.median)} | ${mebibytes(group.heapTotalChangeBytes.median)} | ${mebibytes(group.externalChangeBytes.median)} | ${mebibytes(group.arrayBuffersChangeBytes.median)} |`,
    );
  }

  lines.push(
    "",
    "## Measured-window OS resource deltas",
    "",
    "CPU and kernel counters are snapshots around the same primary interval as the duration timer. CPU time is summed across process threads and can therefore exceed wall time.",
    "",
    "| Mode | Variant | User CPU median (ms) | System CPU median (ms) | Minor faults median | Major faults median | Voluntary switches median | Involuntary switches median | FS reads median | FS writes median |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  );
  for (const group of groups) {
    lines.push(
      `| ${group.mode} | ${group.variant} | ${milliseconds(group.userCpuNanoseconds.median)} | ${milliseconds(group.systemCpuNanoseconds.median)} | ${group.minorPageFaults.median.toFixed(0)} | ${group.majorPageFaults.median.toFixed(0)} | ${group.voluntaryContextSwitches.median.toFixed(0)} | ${group.involuntaryContextSwitches.median.toFixed(0)} | ${group.filesystemReadOperations.median.toFixed(0)} | ${group.filesystemWriteOperations.median.toFixed(0)} |`,
    );
  }

  lines.push("", "## Individual samples", "");
  lines.push(
    "| Round | Order | PID | Mode | Variant | Primary (ms) | JSON.parse (ms) | Peak RSS (MiB) | Window RSS HWM increase (MiB) | User CPU (ms) | System CPU (ms) |",
    "| ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |",
  );
  for (const sample of run.samples) {
    const highWaterIncrease = nonnegativeDelta(
      sample.resourceUsageAfter.maximumResidentSetSizeBytes,
      sample.resourceUsageBefore.maximumResidentSetSizeBytes,
    );
    const userCpu = nonnegativeDelta(
      sample.resourceUsageAfter.userCpuNanoseconds,
      sample.resourceUsageBefore.userCpuNanoseconds,
    );
    const systemCpu = nonnegativeDelta(
      sample.resourceUsageAfter.systemCpuNanoseconds,
      sample.resourceUsageBefore.systemCpuNanoseconds,
    );
    lines.push(
      `| ${sample.round + 1} | ${sample.order + 1} | ${sample.processId} | ${sample.mode} | ${sample.variant} | ${milliseconds(sample.primaryNanoseconds)} | ${sample.jsonParseNanoseconds === null ? "n/a" : milliseconds(sample.jsonParseNanoseconds)} | ${sample.osPeakRssBytes === null ? "n/a" : mebibytes(sample.osPeakRssBytes)} | ${mebibytes(highWaterIncrease)} | ${milliseconds(userCpu)} | ${milliseconds(systemCpu)} |`,
    );
  }

  return `${lines.join("\n")}\n`;
}

async function main(): Promise<void> {
  const inputPath = Bun.argv[2];
  if (inputPath === undefined) {
    throw new Error("Path to raw benchmark JSON is required");
  }
  const input: unknown = JSON.parse(await readFile(inputPath, "utf8"));
  const run = BenchmarkRunSchema.parse(input);
  const markdown = summarizeBenchmarkRun(run);
  const outputPath = join(dirname(inputPath), "summary.md");
  await writeFile(outputPath, markdown, "utf8");
  console.log(JSON.stringify({ status: "pass", output: outputPath }));
}

if (import.meta.main) {
  await main();
}
