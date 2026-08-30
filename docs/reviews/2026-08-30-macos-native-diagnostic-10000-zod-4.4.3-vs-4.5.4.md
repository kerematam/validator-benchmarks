# macOS Native 10,000-Report Zod 4.4.3 vs 4.5.4 Review

Date: August 30, 2026
Status: Engineering rerun; native-host development evidence
Run ID: `dev-diagnostic-10000-2026-08-30T19-17-55.618Z`

## Conclusion

The rerun measured every active validator path ten times in fresh Bun
processes. Zod 4.5.4 was faster than Zod 4.4.3 in both matched interpreted
architectures, and Zod 4.5's native compiler produced the largest Zod speed
and memory improvement.

The fastest measured Zod path was the compiled, `validate()`-gated schema with
separate transformation. It recorded an 80.259 ms median and 483.6 MiB
whole-child peak RSS median. The compiled `safeParse()` separate-transform path
was close at 81.569 ms and 483.0 MiB. Their overlapping, bimodal memory samples
do not establish a meaningful memory difference between those two paths.

For interpreted Zod 4.4, separate transformation was 31.3% faster than native
transformation but used 16.9% more adjusted peak memory. This direction now
reproduces across the two current side-by-side sessions, although it conflicts
with the August 16 historical run. The memory distributions show distinct
allocation regimes, so this should be treated as Bun/JSC process-level behavior
rather than a stable measurement of validator-owned live objects.

Ajv remained the fastest measured real validator. TypeBox's regular compiled
check was close to the best Zod duration and used less adjusted peak memory.
TypeBox native transformation remained an extreme duration and memory outlier;
it is retained in the raw results and tables but omitted from the charts for
readability.

## What was measured

The deterministic diagnostic request contained:

- 10,000 synthetic reports;
- 45,000 columns, 35,000 rows, and 170,000 cells;
- 290,001 objects, 55,001 arrays, and 941,334 scalar values;
- 49,149,405 encoded bytes; and
- seed `20260807` with SHA-256
  `568ae451e49fb981cc8ea5ca1f58e771d2863b3f4db7639581af9f699df61f7a`.

Every variant received ten fresh-process validator-mode samples. Each child
parsed a fresh object graph, variant order rotated by round, every sample was
retained, and no outlier was discarded.

The primary timer began with an already parsed `unknown` value and ended after
validation and normalization. It excluded generation, file I/O, `JSON.parse`,
module loading, compiler setup, hashing, warm-up, and result formatting.
`z.compile()` ran during adapter setup outside the primary timer.

The command was:

```sh
bun run benchmark --profile diagnostic-10000 --seed 20260807 --rounds 10 --mode validator
```

## Correctness and privacy gates

Before measurement:

- the coordinator's complete `bun run test` correctness gate passed;
- the last visible full-suite count was 119 tests, 0 failures, and 1,554
  `expect` calls;
- valid-output and invalid-input parity covered all active Zod paths and
  controls;
- prototype-key schema-only and HTTP integration tests passed;
- the generated-profile privacy audit passed over 10,101 reports, 1,036,655
  keys, and 806,864 string leaves; and
- all 130 measured samples returned 10,000 reports.

Only deterministic synthetic input was measured. No private fixture or source
application data was used.

## Active Zod matrix

| Variant | Version | Execution | Output architecture |
| --- | --- | --- | --- |
| `zod-4.4-native-transform` | 4.4.3 | Interpreted | Zod preprocess/transform/pipe output |
| `zod-4.4-separate-normalization` | 4.4.3 | Interpreted | Transform-free parse, then separate transformation |
| `zod-4.5-native-transform` | 4.5.4 | Interpreted | Zod preprocess/transform/pipe output |
| `zod-4.5-separate-normalization` | 4.5.4 | Interpreted | Transform-free parse, then separate transformation |
| `zod-4.5-compiled-native-transform` | 4.5.4 | Native `z.compile()` | Compiled final transforming schema |
| `zod-4.5-compiled-separate-normalization` | 4.5.4 | Native `z.compile()` | Compiled `safeParse()`, then separate transformation |
| `zod-4.5-compiled-validate-separate-normalization` | 4.5.4 | Native `z.compile()` and `z.validate()` | Boolean gate, diagnostic parse only on failure, then separate transformation |

The `validate()`-gated path normalizes the accepted prepared input directly.
Because boolean validation does not return parsed output, this path explicitly
reproduces the schema's observed `__proto__` stripping. Rejected input receives
a second `safeParse()` pass to construct detailed issues. This valid workload
did not measure that failure-path cost.

Build-time `zod-compiler` variants are no longer active. Their historical
comparison with Zod 4.5's native compiler remains in
[`2026-08-30-zod-native-compiler-vs-zod-compiler.md`](./2026-08-30-zod-native-compiler-vs-zod-compiler.md).

## Duration results

| Rank | Variant | Median | IQR | Full range | Relative to Zod 4.4 native |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Ajv, separate transform | **61.954 ms** | 3.343 ms | 57.813–64.193 ms | 69.1% faster |
| 2 | TypeBox, separate transform | **79.539 ms** | 1.738 ms | 76.701–84.436 ms | 60.4% faster |
| 3 | Zod 4.5 compiled, `validate()`-gated separate transform | **80.259 ms** | 3.724 ms | 79.590–88.185 ms | 60.0% faster |
| 4 | Zod 4.5 compiled, `safeParse()` separate transform | **81.569 ms** | 3.490 ms | 79.793–85.762 ms | 59.4% faster |
| 5 | Zod 4.5 compiled, native transform | **86.929 ms** | 4.594 ms | 84.929–91.373 ms | 56.7% faster |
| 6 | Zod 4.5 interpreted, separate transform | **122.622 ms** | 3.842 ms | 120.546–128.637 ms | 38.9% faster |
| 7 | Valibot, separate transform | **136.154 ms** | 1.929 ms | 133.344–138.257 ms | 32.2% faster |
| 8 | Zod 4.4 interpreted, separate transform | **137.789 ms** | 3.497 ms | 133.870–146.635 ms | 31.3% faster |
| 9 | Valibot, native transform | **166.931 ms** | 2.061 ms | 164.578–172.112 ms | 16.8% faster |
| 10 | Zod 4.5 interpreted, native transform | **172.188 ms** | 3.877 ms | 170.400–179.149 ms | 14.2% faster |
| 11 | Zod 4.4 interpreted, native transform | **200.702 ms** | 6.850 ms | 191.697–205.931 ms | Baseline |
| 12 | TypeBox, native transform | **2,675.721 ms** | 19.854 ms | 2,654.780–2,707.113 ms | 13.33× duration |
| — | No validation | **0.002 ms** | 0.001 ms | 0.002–0.006 ms | Lower bound only |

Ajv was 22.8% faster than the best Zod median. TypeBox was 0.9% faster than
the best Zod median; their distributions overlap enough that this session does
not establish a universal ordering.

## Zod version and architecture comparisons

Zod 4.5.4 improved both interpreted paths relative to 4.4.3:

| Matched architecture | Duration change | Adjusted peak-memory change |
| --- | ---: | ---: |
| Native transform | 14.2% faster | 5.5% lower |
| Separate transform | 11.0% faster | 14.8% lower |

Separate transformation improved speed in every matched Zod execution path:

| Zod execution | Duration change | Adjusted peak-memory change |
| --- | ---: | ---: |
| 4.4.3 interpreted | 31.3% faster | 16.9% higher |
| 4.5.4 interpreted | 28.8% faster | 5.4% higher |
| 4.5.4 compiled `safeParse()` | 6.2% faster | 13.9% lower |
| 4.5.4 compiled `validate()` gate | 7.7% faster | 13.7% lower |

Compilation changed the memory behavior materially: both compiled separate
paths used less peak memory than the compiled native-transform schema, while
the interpreted separate paths used more than their native-transform matches.

## Memory results

Adjusted peak RSS subtracts the 248.4 MiB median no-validation floor from each
whole-child peak median. The percentages compare those adjusted aggregate
medians with Zod 4.4 native transform's adjusted 316.8 MiB baseline.

| Variant | Whole-child peak median | Adjusted peak RSS | Adjusted vs baseline | Window HWM increase median |
| --- | ---: | ---: | ---: | ---: |
| Ajv, separate transform | **387.0 MiB** | **138.6 MiB** | 56.3% lower | 122.3 MiB |
| TypeBox, separate transform | **428.9 MiB** | **180.5 MiB** | 43.0% lower | 161.8 MiB |
| Zod 4.5 compiled, `safeParse()` separate transform | **483.0 MiB** | **234.6 MiB** | 25.9% lower | 233.0 MiB |
| Zod 4.5 compiled, `validate()`-gated separate transform | **483.6 MiB** | **235.2 MiB** | 25.8% lower | 232.6 MiB |
| Zod 4.5 compiled, native transform | **521.0 MiB** | **272.6 MiB** | 14.0% lower | 268.1 MiB |
| Valibot, native transform | **523.1 MiB** | **274.7 MiB** | 13.3% lower | 273.8 MiB |
| Valibot, separate transform | **532.8 MiB** | **284.4 MiB** | 10.2% lower | 284.1 MiB |
| Zod 4.5 interpreted, native transform | **547.8 MiB** | **299.4 MiB** | 5.5% lower | 298.1 MiB |
| Zod 4.4 interpreted, native transform | **565.2 MiB** | **316.8 MiB** | Baseline | 311.6 MiB |
| Zod 4.5 interpreted, separate transform | **563.9 MiB** | **315.5 MiB** | 0.4% lower | 314.4 MiB |
| Zod 4.4 interpreted, separate transform | **618.6 MiB** | **370.2 MiB** | 16.9% higher | 364.0 MiB |
| TypeBox, native transform | **721.6 MiB** | **473.2 MiB** | 49.4% higher | 447.2 MiB |

The memory distributions were often discontinuous. For Zod 4.4 separate
transformation, eight samples measured 616.9–624.6 MiB and two measured about
529–530 MiB. Zod 4.4 native transformation also split between approximately
543–545 MiB and 564–569 MiB. Similar threshold behavior appeared in compiled
Zod and several controls.

The whole-child peak includes process startup, module state, JSON decoding,
validation, retained input/output, and result serialization. The window HWM is
the process high-water increase surrounding the primary operation. Neither is
a direct count of validator-owned objects.

## Environment and limitations

| Item | Recorded value |
| --- | --- |
| Runtime | Bun 1.3.14 |
| Platform | macOS arm64, native host |
| CPU | Apple M2 Max, 12 logical CPUs |
| Memory | 32 GiB |
| Power | AC Power |
| Zod | 4.4.3 and 4.5.4 |
| Ajv | 8.18.0 |
| TypeBox | 1.3.11 |
| Valibot | 1.4.2 |
| Hono | 4.12.11 |
| TypeScript | 6.0.2 |

Machine idleness was not asserted. Load average moved from 2.30/2.00/1.87 to
2.44/2.13/1.93. Aggregate observed CPU moved from 149.4% to 53.6%, and the
busy-process count moved from four to one. These snapshots are observational
and do not prove that unrelated activity was absent during measurement.

This run covers validator mode only. It does not replace the earlier HTTP-mode
evidence and does not measure invalid-request throughput, compiler startup,
long-lived server garbage collection, concurrency, or tail latency under load.

## Evidence

- [Generated run summary](../../results/dev-diagnostic-10000-2026-08-30T19-17-55.618Z/summary.md)
- [Raw samples and environment metadata](../../results/dev-diagnostic-10000-2026-08-30T19-17-55.618Z/raw.json)
- [Synthetic workload manifest](../../results/dev-diagnostic-10000-2026-08-30T19-17-55.618Z/manifest.json)
- [Adapter parity tests](../../test/adapter-parity.test.ts)
- [Prototype-key HTTP tests](../../test/prototype-key-behavior.test.ts)
