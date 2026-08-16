# macOS Native 10,000-Report Benchmark with Zod 4.4.3

Date: August 16, 2026
Status: Engineering repeat; development evidence only
Run ID: `dev-diagnostic-10000-2026-08-16T17-25-04.441Z`

> This is not a publishable performance claim or a validator recommendation.
> The run used the benchmark-only 10,000-report diagnostic envelope, the
> working tree was dirty, and machine idleness was not asserted. It evaluates
> the repository after upgrading Zod from 4.3.6 to 4.4.3.

## Executive summary

All nine real adapters passed the complete correctness gate under Zod 4.4.3.
The no-validation adapter remained a timer and memory floor and was excluded
from normalized-output parity.

The three lowest validation-and-normalization medians were:

1. Ajv plus the shared manual normalizer: **61.729 ms**
2. Compiled Zod plus the shared manual normalizer: **65.107 ms**
3. TypeBox plus the shared manual normalizer: **77.906 ms**

Current Zod's native-transform implementation measured **191.683 ms**. Within
this run, Ajv used 67.8% less median time, compiled Zod with the shared manual
normalizer used 66.0% less, and TypeBox with the shared manual normalizer used
59.4% less than Current Zod. These are comparisons between configured paths
for one synthetic contract, workload, machine, and session; they are not
general validator-library rankings.

The full speed ordering was unchanged from the earlier Zod 4.3.6 session.
Comparing medians between sessions:

- Current Zod was 2.9% higher;
- compiled native-transform Zod was 0.1% lower;
- Zod with shared manual normalization was 1.7% higher; and
- compiled Zod with shared manual normalization was 0.1% lower.

The non-Zod controls moved from 1.0% lower to 1.4% higher, depending on the
variant. The two sessions were not paired or asserted idle, so the 2.9% Current
Zod difference cannot be attributed confidently to the package upgrade. The
stronger observation is that both compiled-Zod medians reproduced within 0.2%
while overall ordering and memory shape remained stable.

The three lowest whole-child median peak RSS values among real adapters were
Ajv at **365.7 MiB**, TypeBox at **372.2 MiB**, and compiled Zod with shared
manual normalization at **374.2 MiB**. Current Zod measured **560.2 MiB**.

No external profiler, memory poller, or power sampler ran during this session.
No thermal or clock-frequency conclusion is made.

## Preflight, correctness, and privacy gates

The following checks completed for the Zod 4.4.3 state:

- `bun run typecheck`: pass;
- benchmark correctness gate, `bun run test`: **109 passed, 0 failed**;
- total assertions: **1,193** across nine test files;
- deterministic generator and manifest tests: pass;
- complete valid-output and invalid-issue parity: pass;
- external-package compiled-build and runtime-marker gates: pass;
- generated benchmark-profile privacy audit: pass; and
- power source: AC power.

The benchmark coordinator ran the complete test suite immediately before
generating the measured input.

The ordinary repository-wide `bun run privacy:audit` command also discovers a
generated compiler-review directory that is not shaped like a benchmark input
profile. To keep code-generation artifacts outside the input audit boundary,
the audit was run from a temporary root containing exactly `smoke`, `small`,
and `diagnostic-10000`. It passed over 10,101 reports, 1,036,655 keys, and
806,864 string leaves. The generated-directory segregation issue remains a
release-gate limitation and is unrelated to the Zod upgrade.

## Metadata correction and rerun

An initial post-upgrade benchmark exposed a stale hard-coded Zod 4.3.6 value in
the coordinator's environment metadata. That result was rejected before
review because its raw record did not identify the installed dependency
correctly.

The exact version literal was updated consistently in the run schema,
coordinator, and summary test fixture. Type checking passed, the benchmark was
rerun from the full correctness gate, and the corrected raw result now records
Zod 4.4.3. The rejected result directory was removed and is not used anywhere
in this report.

## What was measured

The primary timer started with an already parsed `unknown` value and stopped
after one adapter returned normalized data or validation issues. It included
alias preparation, structural validation, and normalization performed by the
adapter. It excluded:

- deterministic request generation;
- file reading;
- `JSON.parse`, which was recorded separately;
- process and module startup;
- schema compilation and compiled-Zod build work;
- hashing and result formatting; and
- the separately available loopback HTTP mode.

Every sample ran in a fresh Bun process with a freshly parsed object graph.
Ten rounds were recorded for each of ten variants, variant order rotated by
round, all 100 samples were retained, and no outlier was automatically
discarded. The request text, parsed graph, and returned value remained
reachable through the post-operation memory snapshot.

Command:

```sh
bun run benchmark --profile diagnostic-10000 --seed 20260807 --rounds 10 --mode validator
```

## Synthetic workload

| Property | Value |
| --- | ---: |
| Profile | `diagnostic-10000` |
| Validation envelope | Diagnostic, maximum 10,000 reports |
| Seed | `20260807` |
| Reports | 10,000 |
| Columns | 45,000 |
| Rows | 35,000 |
| Cells | 170,000 |
| JSON objects | 290,001 |
| JSON arrays | 55,001 |
| JSON scalars | 941,334 |
| Encoded size | 49,149,405 bytes |
| SHA-256 | `568ae451e49fb981cc8ea5ca1f58e771d2863b3f4db7639581af9f699df61f7a` |

All 100 samples reported the same input size and hash and returned 10,000
reports. The manifest is byte-identical to the earlier Zod 4.3.6 run. The
values are deterministic and synthetic. This diagnostic workload is five times
the benchmark's standard 2,000-report envelope and remains a separately
labeled stress case.

## Environment and package versions

| Property | Value |
| --- | --- |
| Execution | Native macOS (`darwin`, `arm64`) |
| CPU | Apple M2 Max, 12 logical CPUs |
| RAM visible to Bun | 32 GiB |
| Power | AC power |
| Bun | 1.3.14 |
| Hono | 4.12.11 |
| Zod | **4.4.3** |
| zod-compiler | 1.23.6 |
| Ajv | 8.18.0 |
| TypeBox | 1.3.11 |
| Valibot | 1.4.2 |
| TypeScript | 6.0.2 |
| Fresh-process samples | 10 per variant |
| External sampler | None |
| Machine idle assertion | Not asserted |
| Working tree | Dirty |

The raw metadata records the Git revision, but the dirty working tree means
that revision alone does not reproduce the exact Zod 4.4.3 state.

Host load averages moved from `2.24 / 1.83 / 1.69` before the run to `2.28 /
1.90 / 1.72` after it. Aggregate snapshots found no process at or above the
coordinator's busy-process threshold immediately before or after the run. The
benchmark's own activity occurs between those snapshots, and machine idleness
was not asserted.

## Adapter equivalence and implementation shape

| Variant | Validation and normalization path |
| --- | --- |
| Current Zod | Zod 4.4.3 preprocess, transform, and pipe stages |
| Compiled Zod | `zod-compiler` output for the same native Zod schemas |
| Zod manual normalizer | Transform-free Zod parse, then shared manual normalization |
| Compiled Zod manual normalizer | Compiled transform-free Zod parse, then shared manual normalization |
| Ajv | Ajv structural validation, then shared manual normalization |
| TypeBox | Accelerated TypeBox structural check, then shared manual normalization |
| TypeBox native transform | Raw accelerated check, Decode codecs, normalized-output accelerated check |
| Valibot | Valibot structural parse, then shared manual normalization |
| Valibot native transform | Alias preparation plus Valibot pipelines and transform actions |
| None | Returns input without validation or normalization |

The correctness corpus covers aliases and precedence, scalar-to-string
normalization, stringified arrays, trimming, required values, unknown-field
stripping, normalized output equality, invalid verdicts, normalized issue
categories and paths, input ownership, and documented dynamic-key behavior.

## Speed results

### Validation and normalization

| Variant | Min (ms) | P25 (ms) | Median (ms) | P75 (ms) | Max (ms) | IQR (ms) | Median relative to Current Zod |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Current Zod | 187.754 | 190.789 | **191.683** | 192.740 | 214.020 | 1.951 | Baseline |
| Compiled Zod | 116.520 | 118.594 | **119.223** | 119.441 | 120.606 | 0.847 | 37.8% lower |
| Zod manual normalizer | 133.692 | 136.194 | **137.448** | 138.081 | 173.606 | 1.887 | 28.3% lower |
| Compiled Zod manual normalizer | 64.480 | 64.647 | **65.107** | 65.610 | 102.253 | 0.963 | 66.0% lower |
| Ajv | 60.898 | 61.094 | **61.729** | 62.154 | 62.634 | 1.060 | 67.8% lower |
| TypeBox | 74.744 | 77.297 | **77.906** | 78.320 | 79.488 | 1.023 | 59.4% lower |
| TypeBox native transform | 2,484.426 | 2,525.085 | **2,530.844** | 2,550.710 | 2,587.073 | 25.625 | 13.20x the duration |
| Valibot | 128.901 | 130.230 | **131.569** | 132.677 | 145.510 | 2.447 | 31.4% lower |
| Valibot native transform | 156.030 | 157.892 | **158.985** | 161.232 | 162.999 | 3.339 | 17.1% lower |
| None | 0.002 | 0.002 | **0.002** | 0.003 | 0.003 | 0.001 | Lower bound only |

Ajv's median was 3.378 ms lower than compiled Zod with the shared manual
normalizer. The compiled-Zod manual path used 1.055 times Ajv's median
duration. Ten samples do not make that gap a universal library difference.

The no-validation result shows negligible call and timer overhead at this
input size. It is not a candidate because it performs neither validation nor
normalization.

### Zod 4.3.6 comparison

Positive change means the Zod 4.4.3 session's median was higher. Only Zod
changed in the package manifest, but every row is shown because non-Zod paths
provide session-drift context.

| Variant | Zod 4.3.6 session | Zod 4.4.3 session | Change |
| --- | ---: | ---: | ---: |
| Current Zod | 186.328 ms | 191.683 ms | **+2.9%** |
| Compiled Zod | 119.350 ms | 119.223 ms | -0.1% |
| Zod manual normalizer | 135.176 ms | 137.448 ms | **+1.7%** |
| Compiled Zod manual normalizer | 65.185 ms | 65.107 ms | -0.1% |
| Ajv | 60.864 ms | 61.729 ms | +1.4% |
| TypeBox | 77.583 ms | 77.906 ms | +0.4% |
| TypeBox native transform | 2,555.178 ms | 2,530.844 ms | -1.0% |
| Valibot | 130.371 ms | 131.569 ms | +0.9% |
| Valibot native transform | 159.585 ms | 158.985 ms | -0.4% |

The interpreted Zod paths were higher while both compiled paths were
effectively unchanged. This does not establish that compilation eliminated a
version regression: the sessions were independent, the tree was dirty, the
machine was not asserted idle, and control variants also moved. A stronger
version claim requires repeated sessions for each version under controlled
conditions.

### JSON decoding

`JSON.parse` remained outside the primary timer. Median decode times ranged
from **55.568 ms** to **57.086 ms** across variants. The similarity of these
medians means decoding does not explain the validator ordering.

## Memory results

| Variant | Median peak RSS (MiB) | Max peak RSS (MiB) | Window HWM increase median (MiB) | Heap-used increase median (MiB) | Heap-capacity increase median (MiB) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Current Zod | **560.2** | 561.6 | 311.9 | 87.3 | 275.1 |
| Compiled Zod | **418.5** | 419.8 | 170.5 | 73.7 | 134.1 |
| Zod manual normalizer | **524.7** | 531.5 | 277.2 | 72.1 | 218.8 |
| Compiled Zod manual normalizer | **374.2** | 376.1 | 126.9 | 87.6 | 90.1 |
| Ajv | **365.7** | 367.9 | 101.7 | 54.3 | 74.8 |
| TypeBox | **372.2** | 429.3 | 104.5 | 57.7 | 75.1 |
| TypeBox native transform | **824.7** | 831.0 | 549.6 | 116.7 | 430.2 |
| Valibot | **424.1** | 534.1 | 176.7 | 76.2 | 142.5 |
| Valibot native transform | **409.4** | 522.5 | 161.5 | 73.0 | 130.3 |
| None | **246.9** | 247.9 | 0.0 | 0.0 | 0.0 |

Whole-child peak RSS includes startup, module state, input decoding,
validation, normalization, and result serialization. It is not a direct count
of live validator objects.

The no-validation median provides an approximate 246.9 MiB common process and
input floor. Subtracting that aggregate median gives:

| Variant | Adjusted median peak RSS | Adjusted vs Current Zod |
| --- | ---: | ---: |
| Ajv | 118.8 MiB | 62.1% lower |
| TypeBox | 125.3 MiB | 60.0% lower |
| Compiled Zod manual normalizer | 127.3 MiB | 59.4% lower |
| Compiled Zod | 171.6 MiB | 45.2% lower |
| Valibot native transform | 162.5 MiB | 48.1% lower |
| Valibot | 177.2 MiB | 43.4% lower |
| Zod manual normalizer | 277.8 MiB | 11.3% lower |
| Current Zod | 313.3 MiB | Baseline |
| TypeBox native transform | 577.8 MiB | 84.5% higher |

These are arithmetic differences between aggregate medians, not paired-sample
measurements. They are useful for approximating a shared floor but must not be
labeled directly measured validator memory.

All real-adapter median peak RSS values were 0.9 to 3.3 MiB lower than in the
Zod 4.3.6 session, including every non-Zod control. That uniform direction is
more consistent with a small session-level shift than with a Zod-specific
memory change.

High-memory samples remained discontinuous for several variants: TypeBox,
Valibot, and native-transform Valibot each had a single substantially higher
sample. No sample was discarded. Median peak RSS must remain paired with raw
samples and environment metadata in any stronger claim.

## CPU observations

| Variant | User CPU median (ms) | System CPU median (ms) |
| --- | ---: | ---: |
| Current Zod | 358.410 | 27.026 |
| Compiled Zod | 281.610 | 16.282 |
| Zod manual normalizer | 386.921 | 23.852 |
| Compiled Zod manual normalizer | 169.217 | 10.649 |
| Ajv | 164.088 | 9.050 |
| TypeBox | 180.288 | 10.021 |
| TypeBox native transform | 3,264.677 | 119.368 |
| Valibot | 297.813 | 16.651 |
| Valibot native transform | 272.940 | 15.623 |
| None | 0.012 | 0.003 |

CPU time is summed across process threads and can exceed wall time. Ajv and
compiled Zod with shared manual normalization again formed the lowest-CPU
group among real adapters.

## Compiler evidence

The native-transform external-package artifact optimized all nine intended
exports with 100% compilable-node coverage and no fallbacks. Transform stages
made each exported schema ineligible for the compiler's fastest path.

| Native compiled artifact property | Result |
| --- | ---: |
| Intended optimized exports | 9 |
| Artifact size | 99,291 bytes |
| Build time | 59.663 ms |
| Fallbacks | 0 |

The transform-free manual-normalizer artifact compiled both request schemas:

| Schema | Coverage | Fast path | Fallbacks |
| --- | ---: | --- | ---: |
| Diagnostic request | 48/48 nodes, 100% | Eligible | 0 |
| Standard request | 48/48 nodes, 100% | Eligible | 0 |

Its artifact was 71,368 bytes and build time was 32.345 ms. Build times are
reported separately and excluded from validation duration.

The fully bundled artifact built to 286,040 bytes but remained incompatible at
runtime under Bun 1.3.14. The benchmark used the external-package
compiled artifact and did not substitute interpreted Zod.

## Interpretation by Zod path

### Current Zod native transforms

The Zod 4.4.3 median was 191.683 ms versus 186.328 ms under Zod 4.3.6, a 2.9%
increase between sessions. Peak RSS was 2.0 MiB lower. One sample reached
214.020 ms while the middle 50% spanned only 1.951 ms.

The result is a signal worth repeating, not evidence of a confirmed regression.
There was no same-session alternating-version design, and other validators
also moved.

### Compiled native transforms

The compiled median was 119.223 ms, 0.1% lower than the earlier 119.350 ms.
Compiler coverage and fallback status were unchanged. This was 37.8% lower
than Current Zod within the Zod 4.4.3 session.

### Zod with shared manual normalization

The uncompiled transform-free path measured 137.448 ms, 1.7% above its earlier
median. The compiled transform-free path measured 65.107 ms, 0.1% below its
earlier median and 66.0% below Current Zod within this run.

The compiled manual-normalizer path remained the strongest Zod-family result
and stayed close to Ajv. Its advantage combines ahead-of-time structural
validation with a different normalization architecture; it is not a
compiler-only comparison.

## What the result supports

This run supports:

- behavioral compatibility of the benchmark under Zod 4.4.3;
- unchanged broad variant ordering at the 10,000-report diagnostic profile;
- continued full compiler coverage with no fallbacks;
- essentially unchanged compiled-Zod medians between the two sessions; and
- retaining Ajv, compiled transform-free Zod, and regular TypeBox with shared
  normalization as the leading candidates for further benchmarking.

This run does not establish:

- that Zod 4.4.3 caused the 2.9% Current Zod difference;
- performance ordering at smaller profiles;
- controlled-idle, cross-machine, or long-lived-process behavior;
- invalid-input throughput;
- a final validator choice; or
- publishable performance claims.

## Required follow-up

For a defensible Zod-version comparison:

1. Run multiple independent sessions per Zod version from clean worktrees.
2. Alternate version order across sessions on an explicitly idle machine.
3. Keep `zod-compiler` and every non-Zod dependency fixed.
4. Retain every fresh-process sample and compare distributions, not only
   medians.
5. Measure the 1,000- and 2,000-report profiles separately.
6. Fix generated-directory segregation so the ordinary privacy command is a
   reliable one-step gate.

## Evidence

- [Generated benchmark summary](../../results/dev-diagnostic-10000-2026-08-16T17-25-04.441Z/summary.md)
- [Raw samples and environment metadata](../../results/dev-diagnostic-10000-2026-08-16T17-25-04.441Z/raw.json)
- [Synthetic workload manifest](../../results/dev-diagnostic-10000-2026-08-16T17-25-04.441Z/manifest.json)
- [Compiled Zod diagnostics](../../results/dev-diagnostic-10000-2026-08-16T17-25-04.441Z/compiled-build-diagnostics.json)
- [Compiled manual-normalizer diagnostics](../../results/dev-diagnostic-10000-2026-08-16T17-25-04.441Z/compiled-manual-normalizer-build-diagnostics.json)
- [Bundled compatibility result](../../results/dev-diagnostic-10000-2026-08-16T17-25-04.441Z/compiled-bundled-compatibility.json)
- [Zod 4.4.3 compatibility review](./2026-08-16-zod-4.4.3-compatibility-review.md)

The older-version review files are intentionally not retained. Their aggregate
comparison values are reproduced in the qualified comparison table above.
