# Zod 4.4.3 vs 4.5.4 Native Host Benchmark Summary

Date: August 30, 2026
Run ID: `dev-diagnostic-10000-2026-08-30T19-17-55.618Z`
Status: Engineering rerun; native macOS development evidence

## Headline

The rerun measured all 13 active variants ten times in fresh Bun 1.3.14
processes. Zod 4.5.4 was faster and used less median peak memory than Zod 4.4.3
in both matched interpreted architectures.

The fastest Zod path was the compiled, `validate()`-gated separate-transform
implementation. It was 7.7% faster and used 13.7% less adjusted peak memory
than Zod 4.5 compiled native transformation. Its result remained close to the
compiled `safeParse()` separate-transform path.

Zod 4.4 separate transformation was 31.3% faster than native transformation
but used 16.9% more adjusted peak memory. The same memory direction now appears
in both current side-by-side runs, but it conflicts with the historical August
16 session and remains sensitive to Bun/JSC heap-growth thresholds.

## Chart-listed results

Adjusted peak RSS subtracts the 248.4 MiB no-validation median. Percentages use
Zod 4.4 native transformation as the baseline.

| Variant | Duration median | Duration vs baseline | Adjusted peak RSS | Memory vs baseline |
| --- | ---: | ---: | ---: | ---: |
| Ajv, separate transform | **61.954 ms** | 69.1% lower | **138.6 MiB** | 56.3% lower |
| TypeBox, separate transform | **79.539 ms** | 60.4% lower | **180.5 MiB** | 43.0% lower |
| Zod 4.5 compiled, `validate()`-gated separate transform | **80.259 ms** | 60.0% lower | **235.2 MiB** | 25.8% lower |
| Zod 4.5 compiled, native transform | **86.929 ms** | 56.7% lower | **272.6 MiB** | 14.0% lower |
| Valibot, separate transform | **136.154 ms** | 32.2% lower | **284.4 MiB** | 10.2% lower |
| Zod 4.4, separate transform | **137.789 ms** | 31.3% lower | **370.2 MiB** | 16.9% higher |
| Valibot, native transform | **166.931 ms** | 16.8% lower | **274.7 MiB** | 13.3% lower |
| Zod 4.4, native transform | **200.702 ms** | Baseline | **316.8 MiB** | Baseline |

The charts intentionally omit TypeBox native transformation because its
2,675.721 ms duration and 473.2 MiB adjusted peak would make the remaining
comparisons difficult to read. It remains preserved in the full review and raw
results.

## Complete Zod comparison

| Zod path | Duration median | Whole-child peak median | Adjusted peak RSS |
| --- | ---: | ---: | ---: |
| 4.4 native transform | 200.702 ms | 565.2 MiB | 316.8 MiB |
| 4.4 separate transform | 137.789 ms | 618.6 MiB | 370.2 MiB |
| 4.5 interpreted native transform | 172.188 ms | 547.8 MiB | 299.4 MiB |
| 4.5 interpreted separate transform | 122.622 ms | 563.9 MiB | 315.5 MiB |
| 4.5 compiled native transform | 86.929 ms | 521.0 MiB | 272.6 MiB |
| 4.5 compiled `safeParse()` separate transform | 81.569 ms | 483.0 MiB | 234.6 MiB |
| 4.5 compiled `validate()`-gated separate transform | **80.259 ms** | 483.6 MiB | 235.2 MiB |

The `validate()`-gated path performs boolean validation on accepted requests
and runs `safeParse()` only after rejection to construct issues. Invalid-input
fallback performance was not measured by this valid workload.

## Boundary and caveats

- The complete correctness gate passed before measurement.
- All 130 samples returned 10,000 normalized reports.
- The valid deterministic input was 49,149,405 bytes with 170,000 cells.
- Every variant received ten fresh-process samples; no outlier was removed.
- The privacy audit passed over all generated profiles.
- Machine idleness was not asserted, and memory samples showed distinct
  allocation regimes.
- This rerun covers validator mode only; HTTP evidence remains separate.

Versions: Bun 1.3.14, Zod 4.4.3 and 4.5.4, Ajv 8.18.0, TypeBox 1.3.11,
Valibot 1.4.2, Hono 4.12.11, and TypeScript 6.0.2.

See the
[full review](./2026-08-30-macos-native-diagnostic-10000-zod-4.4.3-vs-4.5.4.md)
for distributions, measurement boundaries, memory interpretation, limitations,
and evidence links.
