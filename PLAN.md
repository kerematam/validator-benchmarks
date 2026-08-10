# Standalone Structured-Report Validation Benchmark Plan

Status: Correctness gates, development benchmark harness, and the benchmark-only
10,000-report diagnostic envelope implemented. Measured-window process-resource
snapshots and a separately categorized, cgroup-limited Docker runner are also
implemented; publishable performance runs have not started.
Created: August 7, 2026.

## Goal

Create a public, reproducible validation-performance project outside this
application repository. The benchmark will compare the report request contract
under current Zod, ahead-of-time compiled Zod, Zod and compiled-Zod variants
using shared manual post-processing, Ajv, TypeBox and Valibot with shared
normalization, TypeBox and Valibot native-transform variants, and a
no-validation lower bound without involving Effect runtimes, PDF rendering,
ZIP creation, application startup, or production data. An adjacent Bun + Hono
loopback mode measures the same adapters behind a minimal HTTP route and
remains separate from the primary parsed-value validator comparison.

Recommended sibling project location and repository name:

```text
../structured-report-validation-benchmarks
```

The project must be a separate Git repository. It must not be a workspace
package, submodule, symlink, or runtime dependency of this application.

## Decisions

- Reproduce the validation contract, not the existing fixture content.
- Generate all benchmark requests from deterministic synthetic-data code.
- Measure validation and normalization as one operation because normalization
  is part of the current Zod contract.
- Measure `JSON.parse` separately so it is visible but is not attributed to a
  validator.
- Run every measured sample in a fresh child process.
- Use Bun 1.3.14 and Hono 4.12.11 for a separately reported HTTP integration
  mode modeled on the application runtime boundary, without importing Effect
  or application code.
- Keep correctness and compatibility tests separate from performance timing.
- Keep the no-validation adapter as a theoretical floor. It is not a candidate
  implementation because it neither validates nor normalizes raw input.
- Do not copy previous benchmark code, fixtures, normalized outputs, hashes, or
  raw results into the public project.

## Isolation Boundary

| Included | Excluded |
| --- | --- |
| Batch envelope and nested report schemas | Hono and HTTP parsing from the primary validator timer |
| Minimal Bun + Hono loopback integration mode | Application middleware and startup |
| Alias handling, refinements, coercion, and transforms | Effect route wrappers and application errors |
| Current Zod runtime behavior | Typst, pdfmake, and all PDF code |
| `zod-compiler/bun` AOT output | ZIP creation, spooling, and response streaming |
| Transform-free Zod plus shared manual normalization | Application route and error wrappers |
| Ajv validation plus equivalent normalization | Docker application images and server startup |
| TypeBox JIT validation plus equivalent normalization | Application route and error wrappers |
| Valibot validation plus equivalent normalization | Production deployment integration |
| TypeBox decode codecs plus normalized-output validation | Production deployment integration |
| Valibot native transform pipelines | Production deployment integration |
| Identity/no-validation lower bound | Branding, logging, RabbitMQ, and PrizmDoc |
| Synthetic valid and invalid requests | Existing fixtures or customer-derived values |

The measured function begins with an already parsed unknown value and ends with
either a normalized value or validation issues. File reading, process startup,
module loading, schema compilation, fixture generation, output hashing, and
result formatting must remain outside the primary timer.

An adjacent decode measurement may time `JSON.parse` plus validation in the
same child process, but it must be reported as a separate metric. Cold-start and
AOT build time may also be recorded separately and must not be mixed into
steady-state validation time.

The adjacent HTTP metric begins immediately before a loopback `fetch` and ends
after the response body is consumed. It includes Bun's HTTP transport, Hono
routing, server-side JSON decoding, validation/normalization, and the fixed
small response. It is never substituted for the primary validator-only metric.

## Contract Snapshot

Create a benchmark-local, generically named contract snapshot that preserves:

- the strict top-level `{ data: [...] }` envelope;
- the production minimum and 2,000-report maximum;
- report, header, business-object, table, column, row, and cell topology;
- lowercase and PascalCase aliases and their precedence;
- optional scalar coercion to normalized strings;
- trimming and required non-blank name, column-key, and cell-label rules;
- stringified-array handling for applicable header values;
- nested-object unknown-field stripping after container alias selection;
- the exact normalized value shape used by downstream code.

Use generic implementation names such as `StructuredReportSchema`; do not copy
application routes, imports, comments, institution names, or filesystem paths.
Record the snapshot date and dependency versions in the standalone README, but
do not require this repository to exist when the benchmark is installed or run.

The initial dependency matrix must pin exact versions:

| Component | Initial version |
| --- | --- |
| Bun | 1.3.14 |
| Hono | 4.12.11 |
| Zod | 4.3.6 |
| zod-compiler | 1.23.6 |
| Ajv | 8.18.0 |
| TypeBox | 1.3.11 |
| Valibot | 1.4.2 |
| TypeScript | 6.0.2 |

Version upgrades are separate benchmark matrices. Do not use caret or tilde
ranges in the public benchmark lockfile.

## Synthetic Data And Privacy

### Generator requirements

Implement a deterministic seeded generator without Faker, external datasets,
or copied value lists. Its vocabulary should be obviously artificial, for
example:

```text
Synthetic Report 000001
OBJECT-000001
Column 04
Value-R000001-C04
```

The generator must deliberately cover:

- canonical lowercase, PascalCase alias, and mixed-alias inputs;
- string, number, boolean, and null cell/business-object values;
- empty and missing optional fields;
- stringified header arrays;
- safe synthetic unknown fields that verify nested stripping behavior;
- varying column, row, and cell counts;
- valid requests and a separately generated invalid corpus.

Every generated profile must publish its seed, report count, row/column counts,
object/array/scalar counts, encoded byte length, and SHA-256. These structural
statistics are derived only from generated data.

Recommended profiles:

| Profile | Reports | Purpose |
| --- | ---: | --- |
| `smoke` | 1 | Correctness and CI smoke tests |
| `small` | 100 | Fast local iteration |
| `production-1000` | 1,000 | Current common large request comparison |
| `production-max` | 2,000 | Supported contract maximum |
| `diagnostic-10000` | 10,000 | Amplified validator-only signal |

The 10,000-report profile must use a clearly named diagnostic envelope whose
only difference is its benchmark-only upper bound. It must never be described
as the production contract.

Profile density must be chosen and documented openly rather than inferred from
the private fixture. Generated JSON belongs in `.generated/`, is reproducible
from source, and is gitignored. Small hand-auditable synthetic examples may be
committed for contract tests.

### Public-release privacy gate

Before any remote is added or public announcement is made:

1. Create the repository from an empty directory; never copy the current
   fixture or the previous experiment directory into it.
2. Confirm the repository has no parent-directory imports, symlinks, absolute
   paths, submodules, or Git history from this application.
3. Run the generator from a clean checkout and verify deterministic hashes.
4. In the private workspace only, compare synthetic leaf strings of meaningful
   length against the private fixture and fail on unexpected exact matches.
   Schema keys and deliberately generic constants are the only allowlist.
5. Run secret and PII-oriented scans against the complete Git history and the
   generated publication artifacts.
6. Manually inspect committed examples, benchmark summaries, command output,
   stack traces, and machine metadata for names, paths, URLs, tokens, or other
   identifying values.
7. Verify that previous private-fixture timings, hashes, and normalized-output
   hashes were not copied into the public results.
8. Choose and add the public license before publishing.

No production fixture is needed to build, test, benchmark, or audit the public
project.

## Validator Variants

All adapters expose the same small interface: accept `unknown`, then return
either normalized data or a normalized list of validation issues. The adapter
interface and benchmark result decoding must remain fully typed without `any`
or unsafe assertions.

### Current Zod

- Use the benchmark-local snapshot of the current Zod schema.
- Include its preprocessors, refinements, unknown-field stripping, transforms,
  cloning, and normalized output.
- Treat it as the correctness oracle initially, with independent hand-written
  expected cases preventing self-referential fixture-only testing.

### Compiled Zod

- Import the exact same Zod schema source as the current adapter.
- Build the measured entrypoint ahead of time with the actual
  `zod-compiler/bun` plugin.
- Fail setup unless build diagnostics confirm every intended schema was
  optimized.
- Keep runtime packages external initially because the earlier Bun 1.3.14
  experiment produced invalid bundles when dependencies were bundled.
- Add a separate build-compatibility check for fully bundled output; do not
  silently substitute an uncompiled `bun run` path.

### Zod with shared manual post-processing

- Provide ordinary and AOT-compiled Zod variants over the prepared raw shape.
- Keep alias preparation, structural validation, and the shared manual
  normalizer inside the measured operation, matching the Ajv boundary.
- Fail the compiled build unless diagnostics show 100% coverage, fast-path
  eligibility, no fallbacks, and runtime compiler markers.
- Compare normalized output and invalid issue paths against current Zod over
  the complete correctness corpus.
- Record that alias preparation mutates the parsed input while Zod returns a
  distinct parsed graph that the manual normalizer then mutates.

### Ajv

- Compile the JSON Schema once during unmeasured setup.
- Preserve unknown-field stripping and alias-selection behavior.
- Configure the primary parity adapter to collect the issue detail required by
  the contract; any first-error-only configuration is a separately named
  experiment.
- Run equivalent normalization after successful validation and include that
  work in the measured operation.
- Document that in-place mutation differs from current Zod cloning, and test
  its input ownership requirements explicitly.

### TypeBox

- Build an independent TypeBox schema for the prepared contract and compile it
  once with TypeBox's accelerated JIT compiler during unmeasured setup.
- Fail the correctness gate if the compiler is not accelerated under the
  pinned Bun runtime.
- Preserve native TypeBox errors separately while mapping contract-equivalent
  paths and categories.
- Run the same alias selection and normalization used by the Ajv adapter after
  successful validation, including that work in the measured operation.
- Provide a separately named native-transform variant that uses TypeBox decode
  codecs and an accelerated normalized-output schema instead of the shared
  manual normalization traversal.
- Keep both the raw structural and normalized-output TypeBox validators on the
  accelerated path, and include codec decoding plus both checks in the timer.

### Valibot

- Build an independent Valibot schema and prepare its parser during unmeasured
  setup.
- Explicitly guard object stages against arrays so object acceptance matches
  the Zod contract rather than JavaScript's broad object category.
- Preserve native Valibot issues separately while mapping contract-equivalent
  paths and categories.
- Run the same alias selection and normalization used by the Ajv adapter after
  successful validation, including that work in the measured operation.
- Provide a separately named native-transform variant using Valibot schema
  pipelines and transform actions instead of the shared manual normalization
  traversal.

### No validation

- Return the input without inspecting or normalizing the nested graph.
- Do not use Zod, Ajv, TypeBox, Valibot, traversal, hashing, or cloning in the
  measured function.
- Exclude it from normalized-output parity and label every result as a lower
  bound rather than an implementation candidate.

## Correctness Suite Before Performance

Performance commands must refuse to run unless the correctness suite passes.

### Valid-input parity

For current Zod, compiled Zod, both Zod manual-normalizer variants, Ajv,
TypeBox, TypeBox native transforms, Valibot, and Valibot native transforms:

- compare normalized values with structural deep equality, not ordinary JSON
  hashes that are sensitive to object-key insertion order;
- verify canonical, PascalCase, and mixed-alias precedence;
- verify trims, fallback headers, scalar stringification, stringified arrays,
  stripped unknown fields and optional values;
- verify the complete generated `smoke`, `small`, and `diagnostic-10000`
  profiles under their declared envelopes;
- record whether the adapter clones, reuses, or mutates input containers.

### Invalid-input parity

Cover at least:

- missing, non-object, and extra-key top-level envelopes;
- missing, empty, non-array, production-oversized, and diagnostic-oversized
  `data` arrays;
- missing business object or table;
- empty columns and invalid row/cell container types;
- blank name, column key, and cell label;
- invalid scalar values;
- failures at the beginning, middle, and end of a large array;
- one issue versus many issues.

Compare acceptance verdict, normalized issue category, and issue path. Preserve
each engine's native diagnostics separately so mapping differences remain
visible. Application HTTP status and client-message mapping stay outside this
project.

### Generator tests

- Same seed and profile produce byte-identical JSON.
- Different seeds change values without changing the declared shape profile.
- All valid profiles pass all real validators.
- Each invalid case fails for its intended reason.
- Counts, byte lengths, and manifest hashes are recomputed and verified.
- Generated strings match the restricted synthetic vocabulary.

## Benchmark Protocol

### Process model

The coordinator rotates variant order by round and spawns one fresh Bun process
for every variant/profile/round tuple. A child process:

1. loads and prepares one adapter;
2. performs a small unmeasured warm-up;
3. reads and parses the generated request;
4. records the pre-validation memory baseline;
5. times exactly one validation/normalization operation;
6. records post-validation memory and OS process-resource counters while
   keeping the request text, parsed input, and returned value alive;
7. emits one machine-readable result and exits.

Mutation-capable adapters must receive a newly parsed graph. Never reuse an
object graph across variants or measured rounds.

Use 10 measured fresh-process rounds per primary profile. Development
commands may use fewer rounds but must label their output as non-public smoke
results. Do not automatically discard outliers; retain every sample and report
their distribution.

### Metrics

Record at minimum:

- file bytes and `JSON.parse` duration;
- validation/normalization duration;
- parse-plus-validation duration;
- process RSS immediately before and after validation;
- OS-observed peak RSS and incremental peak from the pre-validation baseline;
- Bun `heapUsed`, `heapTotal`, `external`, and `arrayBuffers` before and after;
- measured-window user/system CPU time, page faults, context switches,
  filesystem operations, and RSS high-water increase;
- optional post-GC memory as a diagnostic, never as the primary peak;
- cold module-load/schema-compile time in a separate result category;
- AOT build duration and compiled artifact size outside request timing.

On macOS, wrap children with `/usr/bin/time -l`; on Linux, use
`/usr/bin/time -v` and record cgroup peak when available. The result must record
OS, architecture, CPU model, logical CPU count, total memory, Bun version,
dependency versions, Git revision, power mode where discoverable, and whether
the machine was otherwise idle.

Report median, minimum, maximum, p25, p75, interquartile range, and individual
samples. Use p95 only when the sample count is large enough for it to be
meaningful.

### Workload separation

Publish valid and invalid workloads separately. Do not combine them into one
score. The primary decision metric is the complete valid-input
validation-and-normalization operation because successful production requests
must produce normalized JavaScript data.

Invalid benchmarks must identify error position and issue count; otherwise
early exit can make incomparable validators appear equivalent.

## Proposed Project Layout

```text
structured-report-validation-benchmarks/
  README.md
  LICENSE
  package.json
  bun.lock
  tsconfig.json
  .gitignore
  src/
    contract/
      limits.ts
      zod-schema.ts
      ajv-schema.ts
      typebox-schema.ts
      valibot-schema.ts
      normalized-issue.ts
    generator/
      seed.ts
      profiles.ts
      generate.ts
      manifest.ts
    validators/
      current-zod.ts
      compiled-zod-entry.ts
      ajv.ts
      typebox.ts
      valibot.ts
      contract-runtime.ts
      none.ts
    http/
      create-app.ts
      server.ts
    benchmark/
      child.ts
      coordinator.ts
      memory.ts
      result-schema.ts
      summarize.ts
    privacy/
      synthetic-vocabulary.ts
      audit-generated.ts
  test/
    contract-parity.test.ts
    invalid-parity.test.ts
    generator.test.ts
    mutation.test.ts
    compiled-build.test.ts
  .generated/                 # reproducible, gitignored request bodies
  results/
    .gitkeep
```

Use `bun:test`; do not add Effect merely because the application uses it. The
benchmark target is the validator boundary below the application's Effect
wrapper. If Effect wrapper overhead is later investigated, add it as a separate
adapter and result category rather than changing the core variants.

## Commands And Automation

Provide stable commands such as:

```text
bun install --frozen-lockfile
bun run generate --profile production-1000 --seed 20260807
bun test
bun run build:compiled
bun run build:compiled:manual-normalizer
bun run server --variant current-zod --port 3000
bun run benchmark --profile production-1000 --rounds 10
bun run benchmark --profile production-max --rounds 10
bun run benchmark --profile diagnostic-10000 --rounds 10
bun run summarize results/<run-id>/raw.json
bun run privacy:audit
```

CI should install from the lockfile, regenerate fixtures, verify manifests, run
all correctness tests, build compiled Zod, and execute only smoke benchmarks.
Do not use shared CI runner timings as headline performance results. Public
performance runs should come from a documented dedicated machine and include
raw samples.

## Result Publication

Each publishable run directory contains:

- immutable raw JSON samples;
- the generated profile manifest and input SHA-256;
- correctness/parity results;
- build diagnostics proving the compiled variant was compiled;
- a Markdown summary with methodology and limitations;
- the exact command and Git revision;
- no generated request body unless it has independently passed the privacy
  gate and there is a reason to publish the large artifact.

The summary must show absolute numbers before percentages and clearly identify:

- validation/normalization versus JSON parsing;
- peak RSS versus incremental RSS;
- valid versus invalid input;
- production-limit versus diagnostic profiles;
- parity-preserving validators versus the no-validation floor;
- native-host versus containerized runs, if both are added later.

## Implementation Phases

1. Create an empty sibling Git repository, add pinned tooling, and document the
   isolation boundary.
2. Reproduce the generic contract and build deterministic synthetic generators.
3. Complete the privacy audit before importing any benchmark findings.
4. Implement current Zod, compiled Zod, both Zod manual-normalizer variants,
   Ajv, TypeBox and Valibot manual-normalizer variants, TypeBox and Valibot
   native-transform variants, and the no-validation adapter.
5. Make valid/invalid parity, mutation, and compiled-build tests pass.
6. Implement the fresh-process coordinator and portable memory samplers.
7. Run smoke, 1,000-report, 2,000-report, and diagnostic 10,000-report suites.
8. Review raw results for noise, rerun when environmental controls were not met,
   and publish the complete samples rather than selected runs.
9. Pass the public-release privacy gate and only then add the public remote or
   announce results.
10. Record implementation recommendations back in this repository without
    adding a runtime dependency on the benchmark project.

## Acceptance Gates

The standalone project is ready for public use only when:

- a clean clone runs without this repository or any private fixture;
- the dependency lockfile and generated profile hashes are reproducible;
- correctness tests prove value-level parity for current Zod, compiled Zod,
  both Zod manual-normalizer variants, Ajv, both TypeBox variants, and both
  Valibot variants over the defined corpus;
- invalid verdicts and normalized issue paths meet the declared parity rules;
- compiled Zod cannot silently fall back to ordinary runtime Zod;
- every measured round uses a fresh object graph and fresh process;
- timing excludes generation, file I/O, formatting, and correctness hashing;
- raw samples and environment metadata accompany every claimed comparison;
- no PDF, ZIP, Effect, application, or PrizmDoc code is present; HTTP code is
  limited to the documented minimal Bun + Hono benchmark boundary;
- synthetic-data and full-history privacy audits pass;
- the public report contains no results derived from the private fixture.

This project can inform a production validator decision, but it cannot by
itself authorize a replacement. Any selected implementation still requires an
application-repository integration test for the Effect boundary, stable client
errors, the supported 2,000-report route, and production memory behavior.
