# macOS Native 10,000-Report Benchmark Repeat Summary

Date: August 16, 2026
Status: Engineering repeat; development evidence only

## Median speed and peak-memory comparison

Speed is the median validation-and-normalization duration. Observed peak memory
is the median of each fresh child process's whole-child peak RSS; it is **not**
the maximum observed peak. Adjusted peak RSS subtracts the 247.2 MiB
no-validation median from every observed median. Its percentage comparison uses
Current Zod's similarly adjusted 315.0 MiB as the baseline. Real validators are
ordered by median speed.

| Speed rank | Variant | Median speed | Speed vs Current Zod | Observed median peak RSS | Adjusted peak RSS above 247.2 MiB floor | Adjusted peak RSS vs Current Zod |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | Ajv + shared manual normalizer | **60.864 ms** | 67.3% lower | 368.4 MiB | **121.3 MiB** | 61.5% lower |
| 2 | Compiled Zod + shared manual normalizer | **65.185 ms** | 65.0% lower | 376.0 MiB | **128.8 MiB** | 59.1% lower |
| 3 | TypeBox + shared manual normalizer | **77.583 ms** | 58.4% lower | 375.0 MiB | **127.8 MiB** | 59.4% lower |
| 4 | Compiled Zod, native transforms | **119.350 ms** | 35.9% lower | 419.8 MiB | **172.7 MiB** | 45.2% lower |
| 5 | Valibot + shared manual normalizer | **130.371 ms** | 30.0% lower | 425.7 MiB | **178.5 MiB** | 43.3% lower |
| 6 | Zod + shared manual normalizer | **135.176 ms** | 27.5% lower | 525.7 MiB | **278.5 MiB** | 11.6% lower |
| 7 | Valibot native transforms | **159.585 ms** | 14.4% lower | 410.4 MiB | **163.2 MiB** | 48.2% lower |
| 8 | Current Zod, native transforms | **186.328 ms** | Baseline | 562.2 MiB | **315.0 MiB** | Baseline |
| 9 | TypeBox native transforms | **2,555.178 ms** | 13.71x duration | 828.0 MiB | **580.9 MiB** | 84.4% higher |
| — | No validation | **0.002 ms** | Lower bound only | 247.2 MiB | **0.0 MiB** | Lower bound only |

Ajv with the shared normalizer was the fastest real adapter. Compiled,
transform-free Zod was 4.321 ms, or 7.1%, slower than Ajv while retaining Zod
as the structural schema engine. TypeBox with shared normalization was third.
The no-validation adapter is only a timing and memory floor because it neither
validates nor normalizes the request.

> **Development evidence only.** This was a deterministic synthetic
> 10,000-report diagnostic. The working tree was dirty, machine idleness was
> not asserted, and no external sampler ran. Treat the run as repeat evidence,
> not as a publishable performance claim or final validator recommendation.

## Main conclusion

The August 16 repeat reproduced the complete speed ordering from August 10.
Every real-adapter median was 3.6% to 8.0% lower in the repeat, but the leading
group remained:

1. Ajv with the shared manual normalizer;
2. compiled, transform-free Zod with the shared manual normalizer; and
3. TypeBox with the shared manual normalizer.

For this benchmark contract, normalization architecture mattered more than the
validator library name. Separating structural validation from normalization
again outperformed the corresponding native-transform paths. Current Zod
remains the behavioral baseline; these results do not select a replacement.

## Repeat evidence

Negative change means the August 16 median was lower than the August 10 median.
Both sessions used the same deterministic input bytes, seed, dependency
versions, order rotation, and ten fresh-process samples per variant.

| Variant | August 10 median | August 16 median | Change |
| --- | ---: | ---: | ---: |
| Current Zod | 193.249 ms | 186.328 ms | -3.6% |
| Compiled Zod | 125.582 ms | 119.350 ms | -5.0% |
| Zod + shared manual normalizer | 143.275 ms | 135.176 ms | -5.7% |
| Compiled Zod + shared manual normalizer | 68.759 ms | 65.185 ms | -5.2% |
| Ajv + shared manual normalizer | 64.608 ms | 60.864 ms | -5.8% |
| TypeBox + shared manual normalizer | 82.340 ms | 77.583 ms | -5.8% |
| TypeBox native transforms | 2,776.125 ms | 2,555.178 ms | -8.0% |
| Valibot + shared manual normalizer | 137.722 ms | 130.371 ms | -5.3% |
| Valibot native transforms | 170.439 ms | 159.585 ms | -6.4% |

The unchanged ordering is stronger evidence than any single absolute duration.
The sessions were not controlled idle-machine trials, so the uniform speedup
must not be attributed to one cause.

## Why compiled Zod improved

The native-transform comparison isolates ahead-of-time compilation of the same
Zod contract:

- Current Zod: 186.328 ms and 562.2 MiB median peak RSS.
- Compiled Zod: 119.350 ms and 419.8 MiB median peak RSS.

This reduced median duration by 35.9%. All nine intended schemas compiled with
no fallback, although the transforms prevented the compiler's fastest path.

The larger improvement used a transform-free structural schema followed by the
shared manual normalizer:

- Uncompiled Zod with shared normalization: 135.176 ms.
- Compiled Zod with shared normalization: 65.185 ms.

Both transform-free request schemas were fully compiled, had no fallbacks, and
were fast-path eligible. The manual-normalizer variant is included as a
reference architecture: it keeps structural validation in Zod while making
alias preparation and normalization explicit measured traversals.

The 65.0% improvement from Current Zod to compiled Zod with shared
normalization is therefore not a compiler-only gain. It combines compilation
with a different normalization design.

## What the benchmark measured

The primary timer began with an already parsed `unknown` value and ended after
the adapter returned normalized data or validation issues. It included alias
preparation, validation, and normalization performed by the adapter.

It excluded generation, file I/O, `JSON.parse`, process and module startup,
schema compilation, compiled-build work, hashing, result formatting, and the
separate loopback HTTP mode. `JSON.parse` was recorded separately and had
similar medians across variants.

Each variant had ten samples. Every sample used a fresh Bun process and freshly
parsed object graph, variant order rotated by round, all 100 samples were
retained, and no outlier was automatically discarded.

The run command was:

```sh
bun run benchmark --profile diagnostic-10000 --seed 20260807 --rounds 10 --mode validator
```

## Synthetic workload

| Property | Value |
| --- | ---: |
| Profile | `diagnostic-10000` |
| Reports | 10,000 |
| Columns | 45,000 |
| Rows | 35,000 |
| Cells | 170,000 |
| JSON objects | 290,001 |
| JSON arrays | 55,001 |
| JSON scalars | 941,334 |
| Encoded size | 49,149,405 bytes |
| Seed | `20260807` |

The workload was deterministic and entirely synthetic. Its 10,000-report
diagnostic envelope is five times the benchmark's standard 2,000-report
envelope and must remain a separately labeled stress case.

## Correctness and privacy gates

Before measurement, `bun run typecheck` passed and `bun run test` completed
with **109 tests passed, 0 failed**. All nine real adapters passed valid-output
and invalid-issue parity for the declared synthetic corpus. The no-validation
adapter remained excluded from normalized-output parity.

The ordinary repository-wide `bun run privacy:audit` command currently also
discovers a generated compiler-review directory that is not shaped like a
benchmark profile. To distinguish that directory-layout issue from a data
failure, the same audit was run over an isolated temporary root containing
exactly `smoke`, `small`, and `diagnostic-10000`. It passed over 10,101 reports,
1,036,655 keys, and 806,864 string leaves. The normal command should be fixed
before it is used as a publication gate.

The parity corpus also documents differing handling of the dynamic `__proto__`
row key. Shared-normalizer behavior for that key is a known benchmark
implementation issue, not evidence that any validator independently mutates
prototypes. See the
[`prototype-key-validation-library-review.md`](../security/prototype-key-validation-library-review.md)
review for the detailed boundary.

## Memory interpretation

Peak RSS is whole-process evidence, not a direct measurement of live validator
objects. It includes input decoding, module state, validation, normalization,
and result serialization.

The adjusted values in the opening table subtract aggregate medians. They are
useful for approximating a common process-and-input floor, but they are not
paired-sample deltas and must not be described as directly measured validator
memory.

Several variants again had discontinuous high-memory samples. Even so, the
median peak RSS for every variant was within 1.7 MiB of its August 10 value.
Complete raw samples and environment metadata must accompany stronger claims.
Fresh-process measurements also do not predict garbage collection, throughput,
or tail latency in a long-lived process.

## What the repeat supports

The repeat supports keeping Ajv, compiled transform-free Zod, and regular
TypeBox with shared normalization as the priority candidates for further
benchmarking. It also supports these narrower observations:

- the broad speed ordering reproduced in an independent session;
- native transformation was not automatically faster for this contract;
- the compiled manual-normalizer scenario remained close to Ajv; and
- the three fastest real variants again had the lowest median peak RSS.

The repeat does not establish ordering at smaller profiles, controlled-idle or
cross-machine performance, long-lived behavior, invalid-input throughput, or a
final validator choice.

## Required follow-up

Before making a validator decision:

1. Fix generated-directory segregation so the ordinary privacy command is a
   reliable one-step gate.
2. Repeat from a clean working tree on an explicitly idle machine.
3. Repeat across independent sessions and retain every fresh-process sample.
4. Measure the benchmark's 1,000- and 2,000-report profiles separately.
5. Run long-lived sequential and bounded-concurrency memory diagnostics.
6. Add separately labeled invalid-input performance workloads.

For the complete distributions, environment metadata, compiler diagnostics,
CPU observations, and evidence paths, see the
[full August 16 repeat report](./2026-08-16-macos-native-diagnostic-10000.md).
The [August 10 summary](./2026-08-10-macos-native-diagnostic-10000-summary.md)
is the comparison baseline.
