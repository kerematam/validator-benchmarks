import { expect, test } from "bun:test";
import { BenchmarkRunSchema } from "../src/benchmark/result-schema";
import { summarizeBenchmarkRun } from "../src/benchmark/summarize";

test("development summaries keep primary, decode, memory, and raw samples separate", () => {
  const run = BenchmarkRunSchema.parse({
    schemaVersion: 3,
    development: true,
    runId: "synthetic-run",
    createdAt: "2026-08-08T00:00:00.000Z",
    profile: "smoke",
    validationEnvelope: "production",
    maximumReports: 2_000,
    seed: 20_260_807,
    rounds: 1,
    modes: ["validator"],
    command: "bun run benchmark --profile smoke --rounds 1 --mode validator",
    correctnessGate: { status: "pass", command: "bun run test" },
    environment: {
      executionEnvironment: "native-host",
      platform: "synthetic-os",
      architecture: "synthetic-architecture",
      cpuModel: "Synthetic CPU",
      logicalCpuCount: 1,
      totalMemoryBytes: 1_048_576,
      bunVersion: "1.3.14",
      versions: {
        hono: "4.12.11",
        zod: "4.3.6",
        zodCompiler: "1.23.6",
        ajv: "8.18.0",
        typebox: "1.3.11",
        valibot: "1.4.2",
        typescript: "6.0.2",
      },
      gitRevision: null,
      powerMode: null,
      machineIdle: null,
      hostActivityBefore: {
        capturedAt: "2026-08-08T00:00:00.000Z",
        loadAverage1Minute: 0,
        loadAverage5Minutes: 0,
        loadAverage15Minutes: 0,
        aggregateCpuPercent: 0,
        busyProcessCount: 0,
      },
      hostActivityAfter: {
        capturedAt: "2026-08-08T00:01:00.000Z",
        loadAverage1Minute: 0,
        loadAverage5Minutes: 0,
        loadAverage15Minutes: 0,
        aggregateCpuPercent: 0,
        busyProcessCount: 0,
      },
      containerLimits: null,
    },
    samples: [
      {
        schemaVersion: 3,
        development: true,
        mode: "validator",
        primaryMetric: "validation-and-normalization",
        variant: "current-zod",
        profile: "smoke",
        validationEnvelope: "production",
        maximumReports: 2_000,
        seed: 20_260_807,
        round: 0,
        order: 0,
        processId: 1,
        inputBytes: 100,
        inputSha256:
          "0000000000000000000000000000000000000000000000000000000000000000",
        jsonParseNanoseconds: 100_000,
        primaryNanoseconds: 200_000,
        responseStatus: null,
        outputReportCount: 1,
        memoryBefore: {
          rss: 1_000,
          heapUsed: 500,
          heapTotal: 700,
          external: 100,
          arrayBuffers: 50,
        },
        memoryAfter: {
          rss: 2_000,
          heapUsed: 800,
          heapTotal: 900,
          external: 100,
          arrayBuffers: 50,
        },
        resourceUsageBefore: {
          userCpuNanoseconds: 1_000,
          systemCpuNanoseconds: 2_000,
          maximumResidentSetSizeBytes: 1_500,
          minorPageFaults: 10,
          majorPageFaults: 1,
          swaps: 0,
          filesystemReadOperations: 0,
          filesystemWriteOperations: 0,
          ipcMessagesSent: 0,
          ipcMessagesReceived: 0,
          signals: 0,
          voluntaryContextSwitches: 2,
          involuntaryContextSwitches: 3,
        },
        resourceUsageAfter: {
          userCpuNanoseconds: 101_000,
          systemCpuNanoseconds: 52_000,
          maximumResidentSetSizeBytes: 2_500,
          minorPageFaults: 14,
          majorPageFaults: 1,
          swaps: 0,
          filesystemReadOperations: 0,
          filesystemWriteOperations: 0,
          ipcMessagesSent: 0,
          ipcMessagesReceived: 0,
          signals: 0,
          voluntaryContextSwitches: 3,
          involuntaryContextSwitches: 5,
        },
        osPeakRssBytes: 3_000,
      },
    ],
  });

  const summary = summarizeBenchmarkRun(run);
  expect(summary).toContain("Non-public smoke/development output");
  expect(summary).toContain("## Primary duration");
  expect(summary).toContain("## JSON.parse duration");
  expect(summary).toContain("## OS-observed peak RSS");
  expect(summary).toContain("## In-process RSS change");
  expect(summary).toContain("## Measured-window OS resource deltas");
  expect(summary).toContain("## Individual samples");
  expect(summary).toContain("Execution environment: native-host");
  expect(summary).toContain("Machine-idle assertion: not asserted");
  expect(summary).not.toContain("% faster");
});
