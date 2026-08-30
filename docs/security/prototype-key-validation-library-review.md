# `__proto__` Security Behavior Across Validation Pipelines

Date: August 10, 2026
Reverified: August 30, 2026 for the active Zod 4.4/4.5 matrix
Status: Confirmed local integration behavior; vulnerable shared normalizer retained for benchmarking
Scope: Structured-report row keys in this repository's Bun validation adapters

## Executive answer

In the implementations tested here, the following configured pipelines are
vulnerable to row-local prototype injection:

- Ajv plus the shared manual normalizer;
- TypeBox plus the shared manual normalizer; and
- Valibot plus the shared manual normalizer.

This is **not evidence of a security defect in Ajv, TypeBox, or Valibot
themselves**. All three validators accept `__proto__` because the contract
declares row objects as records with arbitrary string keys. The vulnerability
occurs afterward in this repository's shared JavaScript normalizer.

The vulnerable statement is equivalent to:

```ts
const normalizedRow = {};
normalizedRow[key] = normalizedCells;
```

When an externally controlled `key` is `__proto__`, assignment to an ordinary
object invokes the legacy inherited `Object.prototype.__proto__` setter. The
cell array becomes the normalized row's prototype instead of an own data
property.

## Active Zod 4.4/4.5 matrix

The build-time `zod-compiler` cases were retired after the separate August 30
compiler comparison. The active Zod cases now behave as follows:

| Benchmark variant | Observed normalized-row behavior |
| --- | --- |
| Zod 4.4.3 interpreted, native transforms | Drops `__proto__` |
| Zod 4.4.3 interpreted, separate normalization | Drops `__proto__` before normalization |
| Zod 4.5.4 interpreted, native transforms | Drops `__proto__` |
| Zod 4.5.4 interpreted, separate normalization | Drops `__proto__` before normalization |
| Zod 4.5.4 native compiler, native transforms | Drops `__proto__` |
| Zod 4.5.4 native compiler, separate normalization | Drops `__proto__` before normalization |
| Zod 4.5.4 compiled boolean validation, separate normalization | Explicitly reproduces Zod 4.5's `__proto__` stripping before returning output |

The boolean-validation case needs explicit handling because `z.validate()`
returns only a verdict, not Zod's sanitized parse output. Passing the original
accepted object directly to dynamic-key normalization would reintroduce the
unsafe key. Its adapter therefore skips `__proto__` during normalization, and
the HTTP tests verify that the key is neither retained nor used as a prototype.

## Historical August 16 variant matrix

The following table records the earlier build-time-compiler suite. It is
retained as historical evidence and is not the active benchmark matrix.

| Library or mode | Benchmark variant | Request accepted | Observed normalized-row behavior | Security classification for this path |
| --- | --- | --- | --- | --- |
| Zod | Current Zod | Yes | `__proto__` is dropped | No prototype injection; silent data loss |
| Zod compiler | Compiled Zod | Yes | Preserved as an own data property | No prototype injection observed |
| Zod | Zod manual normalizer | Yes | `__proto__` is dropped before unsafe assignment | No prototype injection; silent data loss |
| Zod compiler | Compiled Zod manual normalizer | Yes | `__proto__` is dropped before unsafe assignment | No prototype injection; silent data loss |
| Ajv | Ajv + shared manual normalizer | Yes | Cell array becomes the row prototype | **Affected integration: row-local prototype injection** |
| TypeBox | TypeBox + shared manual normalizer | Yes | Cell array becomes the row prototype | **Affected integration: row-local prototype injection** |
| TypeBox | TypeBox native transform | Yes | `__proto__` is dropped | No prototype injection; silent data loss |
| Valibot | Valibot + shared manual normalizer | Yes | Cell array becomes the row prototype | **Affected integration: row-local prototype injection** |
| Valibot | Valibot native transform | Yes | `__proto__` is dropped | No prototype injection; silent data loss |
| No validation | None | Yes | Preserved as an own data property from JSON parsing | No prototype injection observed; not a usable validator |

The historical Current Zod versus Compiled Zod difference is a separate compiler behavior
divergence: Current Zod drops the key, while its compiled form preserves it as
a safe own property. Neither path produced row-local injection in this test,
but they are not functionally identical for this edge case.

## Is this externally exploitable?

Yes, the row-local injection is externally triggerable in the benchmark's HTTP
pipeline.

The isolated test sends the standalone fixture file as the raw HTTP request
body over a real loopback connection through `Bun.serve` and Hono. The request
body contains:

```json
{
  "__proto__": [
    {
      "label": "Synthetic Prototype Probe Cell",
      "value": "SYNTHETIC-PROTOTYPE-PROBE-VALUE"
    }
  ]
}
```

The observed sequence is:

1. Hono parses the JSON request body.
2. The parsed row has a normal `Object.prototype` and an enumerable own
   `__proto__` data property. Parsing itself is safe in this test.
3. Ajv, TypeBox, or Valibot validates the row according to the declared
   arbitrary-string-key record schema.
4. The shared normalizer enumerates the own `__proto__` entry.
5. Assignment to `normalizedRow["__proto__"]` changes the new row's prototype.
6. The request still receives a successful validation response.

An external player does not need to construct a JavaScript object or execute
code inside the process. Sending the JSON property is sufficient.

## Demonstrated impact

For the affected Ajv, TypeBox, and Valibot pipelines, the test demonstrates:

- attacker-controlled row-prototype replacement with a validated cell array;
- access to the injected cell through an inherited numeric property such as
  `row[0]`;
- inherited array state and methods through the changed prototype chain;
- disappearance of the `__proto__` row entry from `Object.keys`; and
- disappearance of the affected row data from `JSON.stringify` when no other
  own row fields exist.

This is a real data-integrity and unexpected-inheritance vulnerability. It can
mislead downstream code that assumes validated row data consists only of own
properties or that serialized output preserves all validated cells.

## Direct `isAdmin` object payload

A second end-to-end HTTP case sends this row without any merge operation:

```json
{
  "__proto__": {
    "isAdmin": true
  }
}
```

The contract requires every dynamic row value to be a cell array, so this
object is not a valid row value. The observed outcomes are:

| Variant | HTTP result | Normalized `row.isAdmin` |
| --- | --- | --- |
| Current Zod | Accepted after dropping `__proto__` | `undefined` |
| Compiled Zod | Rejected | No normalized row |
| Zod manual normalizer | Accepted after dropping `__proto__` | `undefined` |
| Compiled Zod manual normalizer | Rejected | No normalized row |
| Ajv | Rejected | No normalized row |
| TypeBox | Rejected | No normalized row |
| TypeBox native transform | Rejected | No normalized row |
| Valibot | Internal error because its parsed output drops the key but the adapter normalizes the original invalid collection | No normalized row |
| Valibot native transform | Accepted after dropping `__proto__` | `undefined` |
| No validation | Accepted with a safe own `__proto__` property | `undefined` |

No variant produced a normalized row for which `row.isAdmin === true`. At the
Hono parse boundary, `__proto__` is an own data property and the row still has
the ordinary `Object.prototype`; an own property named `__proto__` does not by
itself change JavaScript's internal prototype chain.

The Valibot internal error is an adapter integration problem: the Valibot
schema output has already omitted the special key, but the regular adapter
passes the original input to the manual normalizer. The normalizer then sees an
object where a cell array is required. This behavior must not be described as
successful validation.

## Schema-valid cell-array payload carrying `isAdmin`

A third case embeds the marker inside a valid cell so the payload passes every
schema:

```json
{
  "__proto__": [
    {
      "label": "Synthetic Prototype Probe Cell",
      "value": "SYNTHETIC-PROTOTYPE-PROBE-VALUE",
      "isAdmin": true
    }
  ]
}
```

Ajv, TypeBox, and Valibot all accept it because the cell schemas permit
additional properties (`additionalProperties: true` for Ajv and TypeBox;
non-strict `v.object` for Valibot). The row-local prototype injection then
fires in the shared manual normalizer exactly as in the first case. Observed on
the normalized row for those three variants:

- `row instanceof Array` is `true` and inherited `row.length` is `1`: the
  row's prototype really was replaced by the attacker-controlled cell array.
  **Row-local prototype injection is confirmed with a fully schema-valid,
  externally supplied request body.**
- `row[0]` inherits the injected cell, including its normalized `label`.
- `row.isAdmin === true` is **`false`**: the injected prototype is an `Array`,
  which has no `isAdmin` property.
- `row[0].isAdmin` is **`undefined`**: the manual normalizer rebuilds every
  cell with only the known fields (`label`, `value`), stripping `isAdmin`
  before the unsafe assignment runs.

All other variants behave as in the first case (drop the key or preserve it as
a safe own property) and never expose the marker.

The conclusion for targeted property injection is therefore negative in this
pipeline: the schemas only allow an *array* of cells as the `__proto__` value,
and the normalizer strips unknown cell fields before assignment, so no
request can make a normalized row report `isAdmin === true`. Producing a
targeted inherited property such as `isAdmin` would require a normalizer that
assigns an attacker-controlled plain object to `__proto__`, or a downstream
merge that copies inherited properties — neither exists in this benchmark.

## Schema-only validation without the normalizer

A fourth experiment removes the manual normalizer entirely and asks whether any
validator's **own parse output** falls into the legacy `__proto__` setter trap
while constructing result objects. The fixture is:

```json
{
  "control": { "label": "synthetic-control-entry" },
  "__proto__": { "isAdmin": true }
}
```

Each validator gets a fresh simple record schema whose entry schema does **not**
declare `isAdmin`; the marker can only survive through unknown-key tolerance
(`z.looseObject` / `additionalProperties: true` / `v.looseObject`). The
compiled-Zod variant uses the real Bun compiler plugin (both simple schemas
optimized, 2/2), not an interpreted fallback.

| Validator output | Request accepted | `__proto__` in output | `output.isAdmin === true` | Output prototype |
| --- | --- | --- | --- | --- |
| Current Zod | Yes | Dropped entirely | No (`undefined`) | Ordinary `Object.prototype` |
| Compiled Zod | Yes | Preserved as a safe own data property | No (`undefined`) | Ordinary `Object.prototype` |
| Ajv | Yes | Preserved as a safe own data property (input returned unmodified) | No (`undefined`) | Ordinary `Object.prototype` |
| TypeBox | Yes | Preserved as a safe own data property (input returned unmodified) | No (`undefined`) | Ordinary `Object.prototype` |
| Valibot | Yes | Dropped entirely | No (`undefined`) | Ordinary `Object.prototype` |

No validator produced an output for which `output.isAdmin === true`, no output
prototype was replaced, and global `Object.prototype` remained unchanged. The
notable divergence is only whether the key is dropped (Current Zod, Valibot) or
kept as an inert own data property (Compiled Zod, Ajv, TypeBox).

This confirms the layering claim for the loose-entry experiment: Ajv, TypeBox,
Current Zod, Valibot, and the loose compiled-Zod path do not perform the unsafe
assignment in this case. Row-local injection in the corresponding benchmark
adapters requires the shared manual normalizer's
`normalizedRow[key] = value` statement; schema validation alone does not
trigger it in this experiment. The strict compiled-Zod exception is documented
separately below.

### Non-loose entry schemas: the compiled-Zod exception

The schema-only experiment was repeated with the looseness disabled at the
entry level (`z.object` / `additionalProperties: false` / `v.object` instead
of the loose variants). The undeclared `isAdmin` marker then survives nowhere,
but the outcomes diverge sharply:

| Validator output | Result with strict entries |
| --- | --- |
| Current Zod | Accepts; strips the marker and drops `__proto__` entirely |
| Valibot | Accepts; strips the marker and drops `__proto__` entirely |
| Ajv | **Rejects** the payload (`additionalProperties: false`) |
| TypeBox | **Rejects** the payload (`additionalProperties: false`) |
| Compiled Zod | Accepts; strips the marker — **but replaces the output's prototype** with the parsed entry object |

The compiled-Zod strict-record fast path performs the equivalent of
`out[key] = parsedEntry` while assembling the record. With `key = "__proto__"`
the legacy setter fires *inside the compiled parser itself*, so the output's
`[[Prototype]]` becomes the parsed entry object instead of
`Object.prototype`. Undeclared fields such as `isAdmin` are stripped before
the assignment, but **declared entry fields survive into the injected
prototype**: with `"__proto__": {"label": "injected-prototype-label", ...}`
the compiled output reports `output.label === "injected-prototype-label"`
while `Object.hasOwn(output, "label")` is `false`. Interpreted Zod on the
same schema source drops the key and stays clean, so this is a genuine
compiled-versus-interpreted behavioral divergence, not a schema difference.

Impact is narrower than the normalizer case: the attacker controls only the
fields the entry schema declares (here `label`), never arbitrary properties,
and global `Object.prototype` remains untouched. Still, the earlier blanket
statement needs one qualification: with non-loose entry schemas, compiled Zod
*does* perform the unsafe assignment internally — the only validator observed
to do so in this repository.

## What was not demonstrated

The test did not observe:

- modification of global `Object.prototype`;
- pollution of unrelated objects;
- cross-request state changes;
- arbitrary code execution;
- authorization bypass; or
- process escape.

The precise term for the confirmed behavior is **row-local prototype
injection**, not global prototype pollution. A later unsafe merge or downstream
operation could increase impact, but that is outside the evidence currently
collected and must not be claimed from this test.

## Library responsibility versus integration responsibility

| Layer | Responsibility in this result |
| --- | --- |
| Bun/Hono request boundary | Receives the raw HTTP body and produces a safe own `__proto__` data property |
| Ajv, TypeBox, Valibot validators | Accept the property because the row schema deliberately permits arbitrary string keys |
| Shared manual normalizer | Performs the unsafe assignment that changes the row prototype |
| Downstream consumer | May observe inherited cells, array behavior, or missing serialized data |

Therefore it would be inaccurate to publish a claim that “Ajv has a
`__proto__` vulnerability,” “TypeBox has a `__proto__` vulnerability,” or
“Valibot has a `__proto__` vulnerability” based on this repository. The
accurate claim is:

> The Ajv, TypeBox, and Valibot benchmark adapters are vulnerable because they
> combine permissive record validation with this repository's unsafe shared
> manual normalizer.

If the same validation libraries were followed by a safe normalizer, this
specific injection would not occur. Conversely, any validator that passes the
key to this normalizer could expose the same problem.

## Remediation options

The vulnerability is intentionally not fixed yet, following the benchmark's
current experimental decision. Appropriate application fixes would include one
of the following:

- explicitly reject dangerous dynamic keys such as `__proto__` at the contract
  boundary;
- construct dynamic row maps with a null prototype;
- create dynamic properties with `Object.defineProperty` as own data
  properties; or
- use a `Map` internally and convert it safely at a controlled boundary.

Rejecting `constructor` and `prototype` may also be appropriate for defense in
depth, but those keys were not part of this isolated result and need their own
tests before making equivalence claims.

Any remediation must be applied consistently across all variants and followed
by correctness, invalid-input, HTTP, privacy, and performance revalidation.

## Reproduction evidence

- Research briefing for external deep-search follow-up:
  [`prototype-pollution-research-briefing.md`](./prototype-pollution-research-briefing.md)

- JSON fixture:
  [`test/fixtures/prototype-key-request.json`](../../test/fixtures/prototype-key-request.json)
- Direct `isAdmin` object fixture:
  [`test/fixtures/prototype-object-request.json`](../../test/fixtures/prototype-object-request.json)
- Schema-valid cell-array fixture carrying `isAdmin`:
  [`test/fixtures/prototype-cell-request.json`](../../test/fixtures/prototype-cell-request.json)
- Schema-only fixture (no normalizer, `isAdmin` undeclared in every schema):
  [`test/fixtures/prototype-schema-only-request.json`](../../test/fixtures/prototype-schema-only-request.json)
- Schema-only fixture with a declared-field payload for the strict-entry case:
  [`test/fixtures/prototype-schema-only-label-request.json`](../../test/fixtures/prototype-schema-only-label-request.json)
- Isolated raw-file, real loopback HTTP test:
  [`test/prototype-key-behavior.test.ts`](../../test/prototype-key-behavior.test.ts)
- Schema-only test (no normalizer):
  [`test/prototype-schema-only.test.ts`](../../test/prototype-schema-only.test.ts)
- Shared manual-normalizer implementation:
  [`src/validators/contract-runtime.ts`](../../src/validators/contract-runtime.ts)

Run only the characterization test with:

```sh
bun test test/prototype-key-behavior.test.ts
```

The confirmed local run passed all three end-to-end cases with 150 assertions.
They covered all nine real validation variants plus the no-validation floor and
verified that global `Object.prototype` descriptors and its prototype remained
unchanged.
