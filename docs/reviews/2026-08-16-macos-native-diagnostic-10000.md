# macOS Native 10,000-Report Benchmark Repeat

Date: August 16, 2026  
Status: Engineering repeat; development evidence only  
Run ID: `dev-diagnostic-10000-2026-08-16T12-47-10.423Z`

> This is not a publishable performance claim or a validator recommendation.
> The run used the benchmark-only 10,000-report diagnostic envelope, the
> working tree was dirty, and machine idleness was not asserted. It is a
> sampler-free repeat of the August 10 review intended to test whether the
> earlier ordering and memory patterns reproduce.

## Executive summary

All nine validating adapters passed the complete correctness suite before the
benchmark. The no-validation adapter was measured only as a timer and memory
floor and remained excluded from normalized-output parity.

The three lowest validation-and-normalization medians were unchanged from the
earlier session:

1. Ajv plus the shared manual normalizer: **60.864 ms**
2. Compiled Zod plus the shared manual normalizer: **65.185 ms**
3. TypeBox plus the shared manual normalizer: **77.583 ms**

Current Zod's native-transform implementation measured **186.328 ms**. Within
this run, Ajv used 67.3% less median time, compiled Zod with the manual
normalizer used 65.0% less, and TypeBox with the manual normalizer used 58.4%
less than Current Zod. These percentages compare implementations of this one
contract on one synthetic workload and one machine session; they are not
general library rankings.

The same three variants again had the lowest whole-child median peak RSS among
the real adapters: Ajv at **368.4 MiB**, TypeBox at **375.0 MiB**, and compiled
Zod with the manual normalizer at **376.0 MiB**. Current Zod measured **562.2
MiB**. Those medians are within 1.7 MiB of the earlier session for every
variant, despite recurring high-memory samples in several fresh processes.

The repeat was generally faster than the August 10 session: real-adapter
medians decreased by 3.6% to 8.0%, while the ordering remained identical. This
supports the stability of the broad ranking more strongly than it supports any
single absolute number. The session was not declared idle, so uncontrolled host
activity remains a limitation.

No `powermetrics`, profiler, memory poller, or other external sampler ran during
this repeat. Consequently, this report makes no thermal or clock-frequency
claim.

## Preflight and correctness gates

The following checks completed before the measured run:

- `bun run typecheck`: pass;
- `bun run test`: **109 tests passed, 0 failed**;
- deterministic generator and manifest tests: pass;
- complete valid-output and invalid-issue parity: pass;
- compiled-build and runtime-marker gates: pass;
- generated benchmark-profile privacy audit: pass; and
- power source: AC power.

The benchmark coordinator ran the complete 109-test correctness gate again
immediately before generating the measured input.

The repository-wide `bun run privacy:audit` command currently encounters an
auxiliary generated-code review directory that is not shaped like a benchmark
profile. No data gate failed: the audit was run from a temporary isolated copy
containing exactly the `smoke`, `small`, and `diagnostic-10000` profile
directories and passed over 10,101 reports, 1,036,655 keys, and 806,864 string
leaves. Directory segregation should be fixed before treating the ordinary
command as a release gate.

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

Every sample ran in a fresh Bun process with a freshly parsed object graph. Ten
rounds were recorded for each of ten variants, variant order rotated by round,
all 100 samples were retained, and no outlier was automatically discarded. The
request text, parsed graph, and returned value remained reachable through the
post-operation memory snapshot.

Command:

```sh
bun run benchmark --profile diagnostic-10000 --seed 20260807 --rounds 10 --mode validator
```

### Synthetic workload

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

The manifest is byte-identical to the workload used in the earlier report. The
values are deterministic and visibly synthetic. This diagnostic workload is
five times the benchmark's 2,000-report standard envelope and must not be
described as a supported production-sized request.

### Environment

| Property | Value |
| --- | --- |
| Execution | Native macOS (`darwin`, `arm64`) |
| CPU | Apple M2 Max, 12 logical CPUs |
| RAM visible to Bun | 32 GiB |
| Power | AC power |
| Bun | 1.3.14 |
| Hono | 4.12.11 |
| Zod | 4.3.6 |
| zod-compiler | 1.23.6 |
| Ajv | 8.18.0 |
| TypeBox | 1.3.11 |
| Valibot | 1.4.2 |
| TypeScript | 6.0.2 |
| Fresh-process samples | 10 per variant |
| External sampler | None |
| Machine idle assertion | Not asserted |
| Git revision | Recorded in local raw metadata |
| Working tree | Dirty |

The recorded revision improves traceability over the earlier run, but the dirty
working tree prevents the revision alone from reproducing the exact checkout.
The outstanding changes were documentation cleanup, one package script, and
untracked compiler-review material; the measured validator, contract,
generator, and benchmark-coordinator sources were unchanged from the recorded
revision.

Host load averages moved from `1.77 / 1.76 / 1.83` before the run to `2.75 /
2.02 / 1.92` after it. The one-minute increase includes the benchmark's own
work and does not establish unrelated interference. Aggregate snapshots found
two busy processes before the run and none after it, but machine idleness was
not asserted.

## Adapter equivalence and implementation shape

| Variant | Validation and normalization path |
| --- | --- |
| Current Zod | Zod preprocess, transform, and pipe stages |
| Compiled Zod | AOT-compiled form of the same native Zod schema |
| Zod manual normalizer | Transform-free Zod parse, then shared manual normalization |
| Compiled Zod manual normalizer | AOT-compiled transform-free Zod parse, then shared manual normalization |
| Ajv | Ajv structural validation, then shared manual normalization |
| TypeBox | Accelerated TypeBox structural check, then shared manual normalization |
| TypeBox native transform | Raw accelerated check, TypeBox Decode codecs, normalized-output accelerated check |
| Valibot | Valibot structural parse, then shared manual normalization |
| Valibot native transform | Alias preparation plus Valibot pipelines and transform actions |
| None | Returns input without validation or normalization |

The correctness corpus covers lowercase and PascalCase aliases, mixed-alias
precedence, scalar-to-string normalization, stringified arrays, trimming,
required values, unknown-field stripping, normalized output equality, invalid
verdicts, normalized issue categories and paths, ownership, and documented
dynamic-key behavior.

The known `__proto__` behavior remains part of correctness characterization:
Ajv, TypeBox, and Valibot combined with the current shared normalizer can
produce row-local prototype injection, while other variants drop or preserve
the key differently. The behavior and its attribution are documented in
[`prototype-key-validation-library-review.md`](../security/prototype-key-validation-library-review.md).
It is a benchmark implementation issue, not evidence that the three validation
libraries independently mutate prototypes.

## Speed results

### Validation and normalization

| Variant | Min (ms) | P25 (ms) | Median (ms) | P75 (ms) | Max (ms) | IQR (ms) | Median relative to Current Zod |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Current Zod | 180.363 | 185.254 | **186.328** | 188.343 | 206.311 | 3.089 | Baseline |
| Compiled Zod | 112.816 | 116.230 | **119.350** | 121.911 | 134.311 | 5.681 | 35.9% lower |
| Zod manual normalizer | 130.397 | 133.699 | **135.176** | 135.984 | 138.728 | 2.285 | 27.5% lower |
| Compiled Zod manual normalizer | 62.235 | 64.598 | **65.185** | 65.823 | 66.742 | 1.225 | 65.0% lower |
| Ajv | 59.028 | 60.592 | **60.864** | 61.321 | 63.076 | 0.729 | 67.3% lower |
| TypeBox | 74.480 | 76.477 | **77.583** | 78.825 | 80.561 | 2.348 | 58.4% lower |
| TypeBox native transform | 2,511.786 | 2,543.261 | **2,555.178** | 2,574.208 | 2,637.738 | 30.947 | 13.71× the duration |
| Valibot | 125.598 | 129.677 | **130.371** | 130.866 | 132.385 | 1.188 | 30.0% lower |
| Valibot native transform | 153.615 | 159.025 | **159.585** | 160.158 | 161.848 | 1.133 | 14.4% lower |
| None | 0.002 | 0.002 | **0.002** | 0.002 | 0.003 | 0.000 | Lower bound only |

Ajv's median was 4.321 ms lower than compiled Zod with the manual normalizer.
The compiled-Zod manual path used 1.071 times Ajv's median duration. The two
remain the leading group, but the ten-sample distributions do not justify
treating a 4.3 ms gap as a universal difference.

The no-validation result shows that call and timer overhead are negligible at
this input size. It is not a candidate because it performs neither contract
validation nor normalization.

### Repeat comparison

Negative change means the August 16 median was lower than the August 10 median.
Both sessions used the same machine class, dependency versions, input bytes,
seed, variant order rotation, and ten fresh-process samples per variant. The
earlier session had a concurrent `powermetrics` sampler; this repeat did not.

| Variant | August 10 median (ms) | August 16 median (ms) | Change |
| --- | ---: | ---: | ---: |
| Current Zod | 193.249 | 186.328 | -3.6% |
| Compiled Zod | 125.582 | 119.350 | -5.0% |
| Zod manual normalizer | 143.275 | 135.176 | -5.7% |
| Compiled Zod manual normalizer | 68.759 | 65.185 | -5.2% |
| Ajv | 64.608 | 60.864 | -5.8% |
| TypeBox | 82.340 | 77.583 | -5.8% |
| TypeBox native transform | 2,776.125 | 2,555.178 | -8.0% |
| Valibot | 137.722 | 130.371 | -5.3% |
| Valibot native transform | 170.439 | 159.585 | -6.4% |
| None | 0.003 | 0.002 | Not meaningful |

Every real variant was faster in the sampler-free repeat, but the improvement
cannot be attributed solely to removing `powermetrics`: the sessions occurred
on different days with different uncontrolled host state. The stronger result
is that no pair changed order.

### JSON decoding

`JSON.parse` remained outside the primary timer. Median decode duration ranged
from 56.512 to 57.757 ms:

| Variant | Median `JSON.parse` (ms) |
| --- | ---: |
| Current Zod | 56.965 |
| Compiled Zod | 56.536 |
| Zod manual normalizer | 56.601 |
| Compiled Zod manual normalizer | 56.600 |
| Ajv | 57.293 |
| TypeBox | 56.853 |
| TypeBox native transform | 56.512 |
| Valibot | 57.757 |
| Valibot native transform | 56.535 |
| None | 57.739 |

The common median range is narrow enough that parsing does not explain the
validator ordering. One compiled-Zod process recorded an 89.532 ms parse,
which demonstrates why individual samples and maxima remain part of the raw
evidence.

## Memory results

Whole-child peak RSS includes module setup, input decoding, validation,
normalization, and result serialization. The validation-window HWM increase is
the process high-water change between snapshots immediately around the primary
timer.

| Variant | Whole-child peak median (MiB) | Whole-child peak max (MiB) | Window HWM increase median (MiB) | Heap-used delta median (MiB) | Heap-capacity delta median (MiB) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Current Zod | **562.2** | 565.7 | 313.7 | 87.6 | 277.7 |
| Compiled Zod | **419.8** | 531.6 | 171.4 | 73.8 | 135.1 |
| Zod manual normalizer | **525.7** | 613.1 | 277.2 | 72.2 | 219.9 |
| Compiled Zod manual normalizer | **376.0** | 417.5 | 127.2 | 87.6 | 91.5 |
| Ajv | **368.4** | 407.7 | 103.1 | 54.3 | 76.2 |
| TypeBox | **375.0** | 431.2 | 106.0 | 57.6 | 75.8 |
| TypeBox native transform | **828.0** | 835.0 | 550.6 | 117.0 | 430.3 |
| Valibot | **425.7** | 534.9 | 177.4 | 75.9 | 143.0 |
| Valibot native transform | **410.4** | 526.0 | 162.8 | 73.0 | 130.8 |
| None | **247.2** | 248.0 | 0.0 | 0.0 | 0.0 |

The no-validation peak of about 247 MiB is primarily the request text and the
freshly parsed 10,000-report object graph. It is the floor for this process
model, not validator memory.

Median peak RSS was highly repeatable across sessions. The largest median shift
was Current Zod at +1.7 MiB; all others moved by no more than 1.2 MiB. The
fresh-process high-memory modes also recurred:

- compiled Zod had one 531.6 MiB sample while nine were near 419–422 MiB;
- Zod with the manual normalizer had one 613.1 MiB sample while nine were near
  523–527 MiB;
- compiled Zod with the manual normalizer had four samples near 417 MiB and six
  near 374–377 MiB;
- Ajv had one 407.7 MiB sample;
- TypeBox had three samples near 430–431 MiB;
- Valibot had three samples near 533–535 MiB; and
- Valibot native transform had two samples near 524–526 MiB.

These discontinuities are not timing outliers to discard. They appear to be
runtime allocation-policy modes and are part of the implementation's observed
fresh-process behavior on this machine.

Heap-capacity growth again differed materially from live heap growth. Current
Zod retained about 87.6 MiB more live heap but expanded heap capacity by 277.7
MiB. The TypeBox native-transform pipeline expanded capacity by 430.3 MiB.
Reserved capacity and live data must not be described as the same memory cost.

## CPU observations

CPU time is summed across process threads and can exceed wall-clock time.

| Variant | User CPU median (ms) | System CPU median (ms) |
| --- | ---: | ---: |
| Current Zod | 346.019 | 29.540 |
| Compiled Zod | 278.996 | 17.491 |
| Zod manual normalizer | 383.133 | 25.419 |
| Compiled Zod manual normalizer | 167.978 | 11.702 |
| Ajv | 164.348 | 9.380 |
| TypeBox | 185.289 | 10.661 |
| TypeBox native transform | 3,288.859 | 142.738 |
| Valibot | 293.085 | 17.910 |
| Valibot native transform | 271.642 | 17.682 |
| None | 0.013 | 0.004 |

Ajv and compiled Zod with the manual normalizer again formed the lowest-CPU
group among real adapters. TypeBox native transform consumed substantially more
CPU because its measured path includes the full Decode pipeline and two
accelerated checks, not just a boolean schema predicate.

No thermal sampler ran. The report therefore cannot confirm or exclude thermal
frequency changes; it can only state that removing the earlier sampler did not
change the variant ordering.

## Compiler evidence

The native-transform compiled-Zod artifact optimized all nine exported schemas
with 100% compilable-node coverage and no fallbacks. Zod transform stages made
those schemas ineligible for the compiler fast path.

The manual-normalizer compiled artifact optimized both transform-free request
schemas with 48 of 48 nodes compilable in each schema, no fallbacks, and
fast-path eligibility. Its recorded build took 32.3 ms and emitted a 71,368-byte
external-package artifact.

The native-transform external-package build took 58.2 ms and emitted a
99,291-byte artifact. Build time and artifact size were recorded outside the
request timer.

The separate fully bundled compatibility probe still reports
`runtimeCompatible: false` under Bun 1.3.14. The benchmark used only the
external-package compiled artifact and did not substitute interpreted Zod.

## Interpretation by implementation family

### Zod

Compilation reduced native-transform Zod's median from 186.328 to 119.350 ms,
a 35.9% reduction. Moving normalization outside native Zod stages reduced the
ordinary-Zod median to 135.176 ms. Compiling the same transform-free structural
schema reduced it further to 65.185 ms.

The compiled manual-normalizer path remains the strongest Zod-family result. It
was 7.1% slower than Ajv by median in this session while keeping Zod as the
structural schema engine. Ordinary Zod with the manual normalizer was slower
than compiled native Zod here, so moving normalization alone did not outperform
compilation; the combination of transform-free structure and fast-path
compilation produced the leading Zod result.

### Ajv and TypeBox with shared normalization

Ajv again had the lowest primary median, whole-child median peak RSS, and CPU
medians among real adapters. TypeBox's regular accelerated-check path was 27.5%
slower than Ajv by median, while their median peak RSS values differed by only
6.6 MiB.

Both include the same alias preparation and normalization traversal. The
benchmark does not separately time the raw structural checks, so the measured
difference belongs to their complete adapter paths rather than a standalone
claim about either validator engine.

### Native TypeBox and Valibot transforms

TypeBox native transform measured 2,555.178 ms, about 32.9 times the regular
TypeBox path and 13.7 times Current Zod. Its full Decode route performs cloning,
defaulting, conversion, cleaning, assertion, decoding, and normalized-output
validation. This is evidence about that configured pipeline, not TypeBox's
accelerated checking performance.

Valibot native transform measured 159.585 ms versus 130.371 ms for Valibot plus
the shared manual normalizer, a 22.4% increase. Its median peak RSS was lower,
410.4 versus 425.7 MiB, but both variants again showed high-memory process
modes. The repeated direction is useful engineering evidence but remains tied
to this contract and runtime.

## What this repeat supports

The repeat supports these working conclusions:

- the broad validator ordering reproduced across two independent native
  sessions;
- Ajv, compiled transform-free Zod, and TypeBox with the shared normalizer
  remain the leading complete adapter paths for this diagnostic workload;
- compiled transform-free Zod remains close to Ajv and is the leading
  Zod-family result;
- whole-child median RSS is highly repeatable on this machine, while individual
  processes still enter distinct high-memory modes;
- JSON decoding is a common cost and does not explain validator ordering; and
- native transformation is not automatically faster than a specialized manual
  traversal for this contract.

The repeat does **not** support these conclusions:

- that the diagnostic-10000 ordering must hold at smaller workloads;
- that any absolute timing applies to another machine, runtime, or dependency
  version;
- that the 4.3 ms Ajv-versus-compiled-Zod gap is universally meaningful;
- that machine interference or thermal changes were absent;
- that fresh-process behavior predicts sustained long-lived service behavior;
- that HTTP-mode ordering is identical; or
- that the result is publishable while the working tree, privacy command, and
  repository history remain unsanitized.

## Recommended next measurements

1. Fix generated-artifact directory segregation so `bun run privacy:audit`
   passes directly without a scoped temporary copy.
2. Repeat from a clean, sanitized Git revision and explicitly reserve an idle
   machine window.
3. Run at least one additional independent native session before reporting
   session-level aggregate conclusions.
4. Add and measure smaller standard-envelope profiles separately; do not infer
   them from this diagnostic workload.
5. Add separately labeled invalid-input performance workloads.
6. Run the long-lived sequential and bounded-concurrency diagnostic to examine
   GC frequency, throughput, tail latency, and steady-state RSS.
7. Run HTTP mode as its own result category if transport and route overhead are
   part of the decision.

## Local evidence

These artifacts are local, gitignored development evidence:

- [Generated run summary](../../results/dev-diagnostic-10000-2026-08-16T12-47-10.423Z/summary.md)
- [All raw samples and environment metadata](../../results/dev-diagnostic-10000-2026-08-16T12-47-10.423Z/raw.json)
- [Synthetic manifest](../../results/dev-diagnostic-10000-2026-08-16T12-47-10.423Z/manifest.json)
- [Compiled Zod diagnostics](../../results/dev-diagnostic-10000-2026-08-16T12-47-10.423Z/compiled-build-diagnostics.json)
- [Compiled manual-normalizer diagnostics](../../results/dev-diagnostic-10000-2026-08-16T12-47-10.423Z/compiled-manual-normalizer-build-diagnostics.json)
- [Bundled compatibility result](../../results/dev-diagnostic-10000-2026-08-16T12-47-10.423Z/compiled-bundled-compatibility.json)
- [Earlier native review](./2026-08-10-macos-native-diagnostic-10000.md)

The raw samples should remain local until the repository cleanup, privacy
command, clean-revision repeat, and publication review are complete.
