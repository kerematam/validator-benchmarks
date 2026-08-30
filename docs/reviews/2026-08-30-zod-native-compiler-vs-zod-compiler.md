# Zod 4.5 Native Compiler vs `zod-compiler`

Date: August 30, 2026
Status: Development evidence; host-only comparison
Run ID: `dev-diagnostic-10000-2026-08-30T15-35-58.467Z`

## Conclusion

For the same transform-heavy Zod 4.5.4 contract, Zod's native `z.compile()`
was meaningfully faster than the build-time `zod-compiler` 1.23.6 artifact in
this run.

- Validator-only median: **82.376 ms** for native compilation versus
  **116.932 ms** for `zod-compiler`. Native compilation was 29.6% faster, or
  about 1.42x the throughput.
- HTTP median: **198.237 ms** for native compilation versus **227.465 ms** for
  `zod-compiler`. Native compilation was 12.9% faster.
- The ten-sample ranges did not overlap in either mode.

This result is specific to this schema, synthetic workload, runtime, package
versions, and host session. It is strong development evidence, not a general
claim about every Zod schema or JavaScript runtime.

## Compared implementations

Both primary variants used the same final Zod contract, including its
preprocess, transform, and pipe stages. Both returned newly allocated normalized
output and ran through the same result adapter.

| Variant | Compilation mechanism | Compilation boundary |
| --- | --- | --- |
| `native-compiled-zod` | Zod 4.5.4 `z.compile(schema, { strict: true })` | Adapter setup, before warm-up and timing |
| `compiled-zod` | `zod-compiler` 1.23.6 Bun build plugin | Ahead-of-time artifact build, before benchmark processes and timing |

The native adapter rejects a whole-schema no-op compilation result. The
build-time compiler gate reported all intended schemas optimized with no
fallbacks. Its benchmark artifact kept packages external because the separate
fully bundled artifact has a known Bun 1.3.14 runtime incompatibility.

Neither native compilation time nor `zod-compiler` build time was part of the
primary duration. This session therefore compares steady validation and
normalization, not compiler startup cost, build latency, deployment size, or
cold module loading.

## Workload and measurement boundary

The deterministic `diagnostic-10000` input contained:

- 10,000 synthetic reports;
- 45,000 columns, 35,000 rows, and 170,000 cells;
- 49,149,405 encoded bytes; and
- seed `20260807` with one fixed input hash across all samples.

Each mode and variant received ten fresh-process rounds. Variant order rotated,
every sample was retained, and each validator-mode process parsed a fresh
object graph before entering the primary timer.

Validator mode started with an already parsed `unknown` value and measured
validation plus normalization. It excluded generation, file I/O, JSON parsing,
module loading, compilation, hashing, warm-up, and result formatting. HTTP mode
measured a complete loopback request through Bun and Hono, including JSON
decoding, routing, validation, normalization, and response consumption.

The run used Bun 1.3.14 on the native macOS host. Machine idleness was not
asserted. The load average changed from 1.51/1.38/1.45 before the run to
2.64/1.86/1.62 afterward, so the results should not be presented as an isolated
or publication-grade machine study.

## Duration results

### Same transforming schema

| Mode | Variant | Median | IQR | Full range | Native difference |
| --- | --- | ---: | ---: | ---: | ---: |
| Validator | `native-compiled-zod` | **82.376 ms** | 4.972 ms | 80.901-87.939 ms | **29.6% faster** |
| Validator | `compiled-zod` | 116.932 ms | 1.251 ms | 114.961-120.682 ms | Baseline |
| HTTP | `native-compiled-zod` | **198.237 ms** | 4.112 ms | 194.083-206.759 ms | **12.9% faster** |
| HTTP | `compiled-zod` | 227.465 ms | 1.797 ms | 224.420-231.195 ms | Baseline |

The separation was much larger than the within-variant spread. The slowest
native sample was still 27.022 ms faster than the fastest build-time-compiled
sample in validator mode. In HTTP mode, the corresponding gap was 17.661 ms.

The HTTP percentage was smaller because the fixed request, decoding, routing,
and response work diluted the validator difference. The no-validation HTTP
median was 109.332 ms, illustrating the size of that shared non-validator cost.

### Interpreted Zod context

The interpreted `current-zod` median was 167.233 ms in validator mode and
283.983 ms in HTTP mode. Relative to interpreted Zod:

- native `z.compile()` reduced validator median duration by 50.7%;
- `zod-compiler` reduced validator median duration by 30.1%;
- native `z.compile()` reduced HTTP median duration by 30.2%; and
- `zod-compiler` reduced HTTP median duration by 19.9%.

Both compilers therefore provided a substantial improvement over interpreted
Zod for this transform-heavy contract, with native compilation producing the
larger improvement.

## Manual-normalizer nuance

The run also contained a different `zod-compiler` architecture:
`compiled-zod-manual-normalizer`. It validated a prepared, transform-free Zod
schema and then performed normalization in a shared hand-written traversal.
Its medians were **64.173 ms** in validator mode and **177.011 ms** in HTTP mode.

Those results were 22.1% and 10.7% faster, respectively, than the native
compiler's transform-heavy schema. This does **not** reverse the same-schema
comparison because two variables changed at once: the compiler and the
normalization architecture.

No native-compiled transform-free/manual-normalizer variant was measured.
Consequently, this run establishes all of the following, but cannot establish
which compiler would win on that unmeasured architecture:

1. Native `z.compile()` beat `zod-compiler` on the same transforming schema.
2. Moving transformations out of the schema exposed a faster
   `zod-compiler` fast path.
3. The transform-free `zod-compiler` path was the fastest measured Zod-family
   variant in this session.

## Memory results

Memory did not show the same unambiguous winner as duration.

| Mode | Metric | Native | `zod-compiler` | Difference |
| --- | --- | ---: | ---: | ---: |
| Validator | Whole-child peak RSS median | 520.4 MiB | 530.6 MiB | Native 1.9% lower |
| Validator | Measured-window HWM increase median | 268.4 MiB | 281.1 MiB | Native 4.5% lower |
| HTTP | Whole-child peak RSS median | 516.0 MiB | 496.0 MiB | Native 4.0% higher |
| HTTP | Measured-window HWM increase median | 347.4 MiB | 330.0 MiB | Native 5.3% higher |

The direction changed between validator and HTTP modes, and these are
whole-process measurements influenced by module setup, decoding, allocator
behavior, and retained outputs. The run supports a duration conclusion but not
a robust memory-efficiency conclusion between these two compiler variants.

## Correctness and behavioral scope

Before performance measurement, the adapters passed value-level output parity
over the generated profiles and the hand-written valid corpus, plus normalized
issue parity over the invalid corpus. Both production and diagnostic envelopes
were tested. The benchmark returned 10,000 normalized reports for every real
validator sample.

That parity boundary does not mean the compiler implementations are identical
for every JavaScript object. Dedicated prototype-key tests retain and document
implementation-specific behavior for unusual keys such as `__proto__` rather
than hiding those differences behind the main contract corpus.

## Decision for the next benchmark

This direct comparison has already answered the immediate runtime question, so
the next old-versus-new Zod benchmark can omit the `zod-compiler` package
variants. The alternatives such as Ajv, TypeBox, and Valibot can remain as
controls, while this document preserves the compiler comparison and its
limitations separately.

## Evidence

- [Complete host-run summary](../../results/dev-diagnostic-10000-2026-08-30T15-35-58.467Z/summary.md)
- [Raw samples and environment metadata](../../results/dev-diagnostic-10000-2026-08-30T15-35-58.467Z/raw.json)
- [Synthetic workload manifest](../../results/dev-diagnostic-10000-2026-08-30T15-35-58.467Z/manifest.json)
- [Native compiler adapter](../../src/validators/native-compiled-zod.ts)
- [Adapter parity tests](../../test/adapter-parity.test.ts)
- [Prototype-key behavior tests](../../test/prototype-key-behavior.test.ts)
