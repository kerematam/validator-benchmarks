# Structured Report Validation Benchmarks

Status: correctness gates and a development benchmark harness are implemented.
No publishable performance comparison has been run or claimed.

This standalone Bun project will compare validation and normalization for a
generic structured-report JSON contract. It is intentionally independent from
the application that motivated the contract and contains no Effect runtime,
renderer, archive code, production fixture, or customer-derived value. A
minimal Bun + Hono route provides a separately measured HTTP integration mode.

## Implemented foundation

The repository currently provides:

- an August 8, 2026 generic snapshot of the current Zod contract;
- a deterministic seeded generator for the `smoke`, `small`, and benchmark-only
  `diagnostic-10000` profiles;
- manifests with topology, JSON structural counts, encoded bytes, and SHA-256;
- side-by-side Zod 4.4.3 and 4.5.4 interpreted variants using native
  transforms and separate normalization; Zod 4.5 native-compiler variants for
  both architectures; an additional compiled boolean-validation path that
  performs diagnostic parsing only after failure; Ajv, TypeBox, and Valibot
  controls; and the explicitly labeled no-validation floor;
- value-level and invalid-issue corpus checks, mutation checks, and strict
  native-compilation gates while retaining implementation-specific edge
  behavior;
- a minimal Bun + Hono validation route with stable success/error responses;
- fresh-process validator-only and real loopback HTTP development modes;
- raw sample, environment, memory, CPU/kernel-resource, manifest, and Markdown
  summary artifacts; and
- a restricted artificial-vocabulary audit for generated request bodies.

The 1,000- and 2,000-report production profiles, invalid performance workloads,
cold-start category, and publishable controlled-machine runs remain later
phases. Current runs are hard-labeled `development: true`.

## Pinned tools

All declared versions are exact, without caret or tilde ranges:

| Component | Version |
| --- | --- |
| Bun | 1.3.14 |
| Hono | 4.12.11 |
| Zod comparison baseline | 4.4.3 |
| Zod current/native compiler | 4.5.4 |
| Ajv | 8.18.0 |
| TypeBox | 1.3.11 |
| Valibot | 1.4.2 |
| TypeScript | 6.0.2 |

Install and run the correctness gates with:

```sh
bun install --frozen-lockfile
bun run typecheck
bun run test
```

The package alias `zod-4-4` keeps Zod 4.4.3 installed beside the primary
`zod` 4.5.4 package. Zod 4.5 compiler adapters call `z.compile()` with strict
mode during adapter setup, before warm-up and measurement.

## Contract snapshot

`StructuredReportRequestSchema` accepts only a strict `{ data: [...] }`
envelope. The production array contains 1 through 2,000 reports. Nested report,
header, business-object, table, column, row, and cell schemas preserve the
current contract's behaviors:

- nullish lowercase/PascalCase container aliases and field-specific precedence;
- required, trimmed non-blank business-object names, column keys, and cell
  labels;
- optional string, number, boolean, and null scalars normalized to strings;
- stringified-array normalization for header labels and values;
- nested-object unknown-field stripping after container alias selection; and
- normalized data shaped for downstream consumers.

The snapshot uses generic implementation names and has no runtime or build-time
dependency on another repository.

The Zod 4.4 and 4.5 native-transform variants use their schema's preprocess,
transform, and pipe stages. The Zod 4.5 native-compiled equivalent compiles the
final schema during adapter setup. Separate-normalization variants validate a
prepared transform-free schema and then normalize in an explicit traversal.

The additional `zod-4.5-compiled-validate-separate-normalization` variant uses
`z.validate()` for the ordinary boolean verdict. It calls `safeParse()` only
after rejection to construct normalized issues. Because boolean validation
does not return Zod's parsed output, its separate normalization explicitly
reproduces the schema's observed `__proto__` stripping before returning the
normalized result.

Ajv, TypeBox, and Valibot also validate a prepared raw shape before separate
normalization. That traversal rejects required names, column keys, and cell
labels that become empty after trimming. Structural failure stops before
normalization, so these adapters do not synthesize post-transform issues for
an object that already failed raw validation.

`typebox-native-transform` uses the same alias-selection preparation, an
accelerated TypeBox structural check, TypeBox decode codecs, and a second
accelerated TypeBox schema for normalized-output invariants.
`valibot-native-transform` uses the alias-selection preparation followed by
Valibot schema pipelines and `transform` actions. They do not call the shared
manual normalization traversal. Their timers include all preparation,
validation, decoding/transformation, and normalized-output checks they perform.

This is intentionally a realistic implementation comparison rather than a
requirement that every engine execute mechanically identical stages. Native
diagnostics and unusual JavaScript object-key behavior can differ even when
ordinary acceptance and normalized results agree. In particular, the contract
still permits dynamic row keys such as `__proto__`. Acceptance alone is not a
prototype mutation; the documented row-local injection occurs only in
adapters that pass the key to this repository's unsafe shared manual
normalizer. See
[`docs/security/prototype-key-validation-library-review.md`](./docs/security/prototype-key-validation-library-review.md)
for the validator-versus-integration distinction and the separate compiled-Zod
strict-record finding from the historical build-time compiler investigation.

## Synthetic profiles

Synthetic values come only from the local deterministic generator. Tokens are
fixed-width and visibly artificial; no Faker package or external vocabulary is
used. Alias modes rotate by report and nested index. Scalar kinds rotate among
string, number, boolean, and null.

The density is chosen openly and is not inferred from private data:

| Profile | Reports | Columns/report | Rows/report | Cells/report | Purpose |
| --- | ---: | ---: | ---: | ---: | --- |
| `smoke` | 1 | 3 | 2 | 6 | Hand-auditable correctness and CI input |
| `small` | 100 | 3–6 | 2–5 | 6–30 | Fast local corpus with index-based variation |
| `diagnostic-10000` | 10,000 | 3–6 | 2–5 | 6–30 | Benchmark-only amplified validator signal |

Each generated row has one synthetic cell per declared column. In `small`, the
column and row counts cycle every four reports, yielding 450 columns, 350 rows,
and 1,700 cells in total. The seed changes value tokens but not this declared
shape. `diagnostic-10000` uses the same open density pattern at larger scale.
Its envelope differs only by raising the benchmark maximum to 10,000; it is not
the supported production contract, whose maximum remains 2,000.

Generate both milestone profiles and audit them with:

```sh
bun run generate --profile smoke --seed 20260807
bun run generate --profile small --seed 20260807
bun run generate --profile diagnostic-10000 --seed 20260807
bun run privacy:audit
```

Each command writes `request.json` and `manifest.json` beneath a seed-specific
directory in `.generated/`. That directory is reproducible and gitignored.
Manifest verification recomputes report/column/row/cell counts, JSON
object/array/scalar counts, encoded byte length, and SHA-256 from the saved
request.

## Benchmark modes

Both modes run every measured sample in a fresh Bun process and rotate variant
order by round:

- `validator` starts with a freshly `JSON.parse`d unknown value and times only
  validation plus normalization. JSON decoding is recorded separately.
- `http` starts a real loopback `Bun.serve` instance with Hono, then times a
  complete `fetch` through routing, server-side decoding, validation,
  normalization, the fixed small response, and response-body consumption.

Generator work, file I/O, adapter loading, native Zod, Ajv, and TypeBox schema
compilation, hashing, warm-up, and result formatting remain outside both
primary timers. Variant modules load
independently so one validator does not initialize the others in its benchmark
child. The Hono route calls the adapters directly; Effect and application
middleware are intentionally absent.

Each child takes `process.memoryUsage()` and `process.resourceUsage()` snapshots
immediately around the primary timer. This records retained RSS and JavaScript
heap/external-memory changes, the increase in the process RSS high-water mark,
user/system CPU time, page faults, context switches, and filesystem operation
counts for the measured window. `/usr/bin/time` independently records the
whole-child peak RSS; that broader peak also includes module setup, input
decoding, and result serialization and is labeled separately.

The request-text JavaScript value, parsed input graph, and normalized result are
all kept explicitly reachable through the post-operation snapshots. This
prevents ordinary local-variable liveness from making a cloning validator
appear to use less memory merely because its original input became unreachable.
The runtime can still release internal file-buffer backing storage or move
memory between accounting categories, so component deltas may be negative;
OS-observed RSS high-water marks remain the primary RAM evidence.

Run development benchmarks with:

```sh
bun run benchmark --profile smoke --rounds 1 --mode both
bun run benchmark --profile small --rounds 3 --mode validator
bun run benchmark --profile diagnostic-10000 --rounds 10 --mode both
bun run benchmark:docker --profile diagnostic-10000 --rounds 10 --mode both
bun run benchmark:docker-memory --rounds 10 --sampling-interval-ms 5 --seed 20260807
bun run summarize results/<run-id>/raw.json
```

For manual route inspection:

```sh
bun run server --variant zod-4.5-compiled-native-transform --port 3000
```

Raw runs are written beneath `results/` with their manifest, environment
metadata, all individual samples, and a development summary. The directory is
gitignored pending privacy and publication review.
Development runs remain non-public engineering evidence until environmental
controls, publication profiles, and release gates are complete.

## Native host and Docker

The benchmark runs natively by default and records `executionEnvironment`,
safe aggregate host-load observations before and after the run, and whether an
idle machine was explicitly asserted. Native results are not Docker results.

Docker is not an isolation guarantee: containers still compete for host CPU,
memory bandwidth, thermal headroom, and—on macOS—the Docker VM itself adds a
different runtime boundary. Native-host and containerized measurements must be
separate result categories. Publishable comparisons require a controlled,
documented machine, no concurrent workloads, stable power settings, rotated
variant order, retained outliers, and repeated fresh-process samples.

The Docker command builds from the pinned Bun 1.3.14 image digest and adds only
pinned GNU `time`/`ps` packages. The image build needs Debian-mirror access, but
the benchmark container itself runs without external networking. It applies a
four-CPU, 2-GiB RAM, zero-swap, 256-process cgroup envelope; the detected cgroup
limits are saved in the run metadata. The source tree is bind-mounted so
generated inputs and raw results remain local. These caps make the container
run more repeatable, but do not turn Docker Desktop into a dedicated machine or
make its absolute Linux/VM memory numbers interchangeable with native macOS.

The separate `benchmark:docker-memory` diagnostic runs every first-class
variant with one fresh container—and therefore one reset cgroup
`memory.peak`—per sample. Every variant uses the same benchmark child and a
freshly parsed input graph. A small parent process polls target RSS and cgroup
memory every 5 ms. The measured child emits a private phase marker after the
timed validation, retains both input and normalized output for 250 ms, and only
then permits the parent to sample the more intrusive `smaps_rollup` PSS/private
metrics every 25 ms. Target-process HWM and per-container cgroup peak are the
primary evidence; sampled PSS/private values are supporting diagnostics. The
sampler changes scheduling enough that its duration values must not replace the
primary performance benchmark.

Every Zod version/compiler/normalization combination listed above is a
first-class benchmark variant. Their timers cover validation plus
normalization and use input bytes identical to the non-Zod controls.

## Privacy boundary

The generated-output audit checks object keys and every string leaf against the
explicit artificial vocabulary. Failure output contains only issue kinds and
structural paths, never rejected values. This is an early correctness gate; it
does not replace the final local-only exact-string overlap audit, secret/PII
history scans, manual artifact review, license choice, or the other publication
gates.

No remote should be added and no results should be published until every final
privacy gate passes.
