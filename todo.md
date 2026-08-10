# TODO

## Measure sustained-load GC behavior

The existing benchmark uses one fresh Bun process and one validation operation
per sample. It measures per-request validation speed and peak memory, but it
does not show how JavaScriptCore behaves when a long-lived Bun/Hono process
handles many sequential or concurrent requests.

Current Zod's macOS-versus-Docker RSS difference follows JSC's perceived
machine RAM: the normalized live heap is approximately equal, while JSC keeps
substantially more heap capacity when it perceives 32 GiB instead of Docker's
approximately 11.7 GiB. The 2 GiB Docker cgroup limit was not the primary
cause.

Add a separate long-lived-process diagnostic that:

- compares identical `BUN_JSC_forceRAMSize` settings across macOS and Docker;
- exercises both sequential requests and bounded concurrency;
- keeps the 10,000-report workload diagnostic-only and distinct from the
  2,000-report production maximum;
- reports throughput and p50, p95, and p99 latency;
- records GC count, total GC duration, CPU time, steady-state and peak RSS,
  cgroup memory events, and OOM events;
- distinguishes collectible per-request output from deliberately retained
  output;
- preserves every sample and does not discard outliers;
- runs correctness and privacy gates before performance measurement.

This diagnostic should determine whether the smaller JSC heap trades lower RSS
for more GC CPU, reduced throughput, or worse tail latency under sustained
load. Do not infer that performance degradation exists from the current
fresh-process benchmark alone.
