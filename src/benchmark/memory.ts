import type { z } from "zod";
import type {
  MemorySnapshotSchema,
  ResourceUsageSnapshotSchema,
} from "./result-schema";

export type MemorySnapshot = z.infer<typeof MemorySnapshotSchema>;
export type ResourceUsageSnapshot = z.infer<
  typeof ResourceUsageSnapshotSchema
>;

export function readMemorySnapshot(): MemorySnapshot {
  const memory = process.memoryUsage();
  return {
    rss: memory.rss,
    heapUsed: memory.heapUsed,
    heapTotal: memory.heapTotal,
    external: memory.external,
    arrayBuffers: memory.arrayBuffers,
  };
}

export function readResourceUsageSnapshot(): ResourceUsageSnapshot {
  const usage = process.resourceUsage();
  // Bun follows the host APIs: ru_maxrss is bytes on macOS and KiB on Linux.
  const maximumResidentSetSizeBytes =
    process.platform === "linux" ? usage.maxRSS * 1_024 : usage.maxRSS;
  return {
    userCpuNanoseconds: usage.userCPUTime * 1_000,
    systemCpuNanoseconds: usage.systemCPUTime * 1_000,
    maximumResidentSetSizeBytes,
    minorPageFaults: usage.minorPageFault,
    majorPageFaults: usage.majorPageFault,
    swaps: usage.swappedOut,
    filesystemReadOperations: usage.fsRead,
    filesystemWriteOperations: usage.fsWrite,
    ipcMessagesSent: usage.ipcSent,
    ipcMessagesReceived: usage.ipcReceived,
    signals: usage.signalsCount,
    voluntaryContextSwitches: usage.voluntaryContextSwitches,
    involuntaryContextSwitches: usage.involuntaryContextSwitches,
  };
}
