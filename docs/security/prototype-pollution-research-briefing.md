# Research Briefing: Prototype Pollution in Validation-Library Pipelines

Date: August 10, 2026
Audience: research agent performing a deep search on prototype pollution
terminology, prior art, tooling behavior, and mitigation guidance.
Status of this document: briefing only. Every behavioral claim listed here was
verified by executable tests in this repository; anything beyond these claims
is an open research question, not an established fact.

## 1. Project context

Repository: `structured-report-validation-benchmarks` — a Bun 1.3.14 benchmark
comparing validation libraries on a structured-report batch request contract.

Pinned versions:

- Zod 4.3.6 (interpreted, "current-zod")
- zod-compiler 1.23.6 with its Bun build plugin ("compiled-zod")
- Ajv 8.18.0
- TypeBox 1.3.11 (plus a native-transform variant)
- Valibot 1.4.2 (plus a native-transform variant)
- Hono 4.12.11 on `Bun.serve` for the HTTP boundary

Contract detail that matters: report table rows are declared as
`Record<string, Cell[]>` — arbitrary string keys are allowed by design, and
every row value must be an array of cell objects. Cell objects tolerate
unknown properties (`additionalProperties: true` / `v.looseObject` /
`z.looseObject`-style parsing depending on the library).

A shared "manual normalizer" (`src/validators/contract-runtime.ts`) copies
validated rows into fresh objects with a key-by-key assignment loop:

```ts
const normalizedRow: Record<string, unknown> = {};
for (const [key, cells] of Object.entries(row)) {
  normalizedRow[key] = cells.map(/* ... */);
}
```

The prototype-injection behavior of this normalizer is intentionally retained
for experimentation; it is a known, documented vulnerability in this repo.

## 2. Verified experiment results (all reproduced by tests)

Fixtures and tests:

- `test/fixtures/prototype-key-request.json` — `__proto__` with a cell array
- `test/fixtures/prototype-object-request.json` — `__proto__: {isAdmin: true}`
- `test/fixtures/prototype-cell-request.json` — `isAdmin` inside a valid cell
- `test/fixtures/prototype-schema-only-request.json` — no-normalizer case
- `test/prototype-key-behavior.test.ts` — end-to-end HTTP characterization
- `test/prototype-schema-only.test.ts` — validator-output-only characterization
- Full results and per-variant matrices:
  `docs/security/prototype-key-validation-library-review.md`

### Experiment A — `__proto__` as a valid cell array, full HTTP pipeline

Payload passes Ajv, TypeBox, and Valibot schemas. The shared manual
normalizer's assignment then fires the legacy `Object.prototype.__proto__`
setter: the normalized row's `[[Prototype]]` is replaced by the
attacker-controlled cell array. Verified on the normalized row:

- `row instanceof Array === true`
- inherited `row.length === 1`
- `row[0]` resolves to the injected cell
- `Object.keys(row)` is empty and `JSON.stringify(row)` is `"{}"`
- global `Object.prototype` descriptors and its prototype remain unchanged

Zod (interpreted) and the native-transform variants drop the key; compiled Zod
preserves it as an own data property. Term used in this repo for the impact:
**row-local prototype injection**, explicitly not global pollution.

### Experiment B — `__proto__: {isAdmin: true}` (object, not array)

Rejected by Ajv/TypeBox (HTTP 400: row values must be cell arrays). Valibot's
adapter errors (HTTP 500 integration quirk: its parse output drops the key,
but the adapter normalizes the original invalid input). Zod variants accept
only by dropping the key. No variant produced `row.isAdmin === true`.

### Experiment C — `isAdmin: true` inside a schema-valid cell

Passes every schema (cells tolerate unknown properties). Pollution still fires
in the normalizer, but the normalizer rebuilds cells keeping only
`label`/`value`, so the marker is stripped before the unsafe assignment:

- `row.isAdmin === true` → false (injected prototype is an Array)
- `row[0].isAdmin === true` → false (stripped by cell normalization)

### Experiment D — schema-only validation, no normalizer

Fresh minimal record schemas per library; entry schemas do NOT declare
`isAdmin` (it survives only via unknown-key tolerance). Payload:
`{"control": {"label": "..."}, "__proto__": {"isAdmin": true}}`.

| Validator output | Accepted | `__proto__` in output | `output.isAdmin === true` | Output `[[Prototype]]` |
| --- | --- | --- | --- | --- |
| Current Zod | yes | dropped | false (`undefined`) | `Object.prototype` |
| Compiled Zod | yes | kept as own data property | false (`undefined`) | `Object.prototype` |
| Ajv | yes | kept as own data property (input returned as-is) | false (`undefined`) | `Object.prototype` |
| TypeBox | yes | kept as own data property (input returned as-is) | false (`undefined`) | `Object.prototype` |
| Valibot | yes | dropped | false (`undefined`) | `Object.prototype` |

For the "kept" outputs, `output.__proto__.isAdmin === true` IS true — but this
is plain data access on an own property (own properties shadow the inherited
`__proto__` getter), not pollution. Confirmed via `Object.getPrototypeOf`.

**Experiment D2 — same payload, non-loose entry schemas** (`z.object` /
`additionalProperties: false` / `v.object`): the undeclared `isAdmin` marker
is stripped or rejected everywhere, but one validator crosses the line —
compiled Zod's strict-record fast path performs the unsafe key assignment
internally, so its output's `[[Prototype]]` is replaced by the parsed entry
object (no own `__proto__` key). Declared entry fields survive into that
prototype: with `"__proto__": {"label": "injected-prototype-label"}` the
compiled output inherits `output.label === "injected-prototype-label"`
(`Object.hasOwn(output, "label") === false`). Interpreted Zod on the same
schema source drops the key and stays clean; Ajv/TypeBox reject the payload;
Valibot drops the key. This is a compiled-vs-interpreted Zod divergence and
the only observed case in this repo of a validator itself performing the
unsafe assignment.

### Verified JavaScript primitives (Bun 1.3.14)

Given `const src = JSON.parse('{"__proto__":{"isAdmin":true}}')`:

| Operation | Result |
| --- | --- |
| `JSON.parse` | own enumerable `__proto__` data property; chain untouched (spec: `CreateDataProperty` semantics) |
| `out[k] = v` copy loop | setter fires → `out`'s prototype replaced |
| `Object.assign({}, src)` | setter fires (`[[Set]]`) → target polluted |
| `{ ...src }` spread | safe — own key copied, chain untouched |
| `Object.fromEntries(...)` | safe — own key created, chain untouched |
| path-walk write `obj["__proto__"]["isAdmin"] = true` | **global** pollution: `Object.prototype.isAdmin === true`, every object affected |
| primitive value `out["__proto__"] = "x"` | ignored by the legacy setter (only objects/null set the prototype) |

## 3. Working terminology (to be validated/refined by research)

Current repo wording treats the pieces separately:

- **Source**: schema-validated, attacker-controlled `__proto__` key retained
  as an own data property (Experiment D "kept" outputs).
- **Gadget**: code patterns that convert the inert key into pollution
  (assignment copy loops, `Object.assign`, deep merges, path setters).
- **Sink**: the exact dangerous statement (`target[key] = value` /
  path-walk through `__proto__`).
- **Impact states**: row-local prototype injection (demonstrated) vs. global
  `Object.prototype` pollution (demonstrated only at primitive level, not in
  the benchmark pipeline).

Candidate names for the intermediate "inert but armed" state, as currently
understood: **latent/dormant prototype pollution**;
**stored/second-order prototype pollution** (payload survives
`JSON.stringify` and can detonate in a different component or service);
**dangerous-key retention** at the boundary. Formal weakness classes cited so
far: **CWE-1321** (prototype pollution) and **CWE-915** (modification of
dynamically-determined object attributes, mass-assignment-flavored enabler).

Repo's current one-sentence formulation:

> The validators' outputs carry a latent (second-order) prototype-pollution
> payload: a validated, attacker-controlled `__proto__` own property that is
> inert on the object itself but activates at any downstream assignment-based
> copy or merge gadget (CWE-1321, enabled by CWE-915-style arbitrary-key
> acceptance).

## 4. Research questions for the deep search

1. **Terminology for the intermediate state.** Is there an established or
   canonical term for "validated attacker-controlled `__proto__` retained as
   an inert own property, not yet activated"? Survey: academic literature
   (e.g., prototype-pollution measurement/exploitation papers), PortSwigger
   research (Gareth Heyes' client-side prototype pollution work and its
   source/gadget/sink model), CodeQL/GitHub Security Lab writeups, OWASP
   cheat sheets, vendor security advisories. Is "second-order prototype
   pollution" an accepted term, and does its usage match the meaning above?
2. **CWE scope check.** Does CWE-1321 formally cover only the modification
   act, or also the retention/acceptance state? Is CWE-915 (or another entry)
   the right classification for "schema accepts and preserves dangerous
   keys"? Any CAPEC attack-pattern IDs that map to the two-stage flow?
3. **Prior art / CVEs matching the two-stage pattern.** Real incidents where
   a validator/parser/sanitizer preserved `__proto__` as data and a later
   merge/assign activated it — especially any involving validation libraries
   (Ajv, Zod, Joi, Yup, class-validator, TypeBox, Valibot) or JSON Schema
   tooling. Anchor CVEs to compare against: lodash.merge (CVE-2018-16487,
   CVE-2019-10744), jQuery extend (CVE-2019-11358), qs, minimist,
   yargs-parser, hoek, mout, deep-extend, node.extend. Confirm each CVE's
   actual mechanism before citing.
4. **SAST/DAST tooling behavior.** How do CodeQL, Semgrep, ESLint security
   plugins, Snyk, and Socket model this? Do any rules flag *retention* of
   dangerous keys in validated output, or do they only flag sinks
   (`obj[key] = value` with user-controlled key)? Collect concrete rule IDs.
5. **Library documentation of `__proto__` handling.** Do Zod, Ajv, TypeBox,
   Valibot, Joi, or Yup document whether dynamic `__proto__` keys are
   dropped, preserved, or rejected in record/loose-object parsing? Any
   GitHub issues, advisories, or changelog entries about this divergence
   (our observed drop-vs-preserve split between interpreted Zod/Valibot and
   compiled-Zod/Ajv/TypeBox)?
6. **Published mitigation guidance.** Null-prototype row maps,
   `Object.defineProperty` own-property creation, `Map` internally,
   schema-level key denylists (`__proto__`, `constructor`, `prototype`),
   `Object.freeze(Object.prototype)`, Node's `--disable-proto` modes,
   `Object.hasOwn` guards before dynamic assignment. Note which sources
   recommend which, and any documented downsides.
7. **Attribution language.** How do reputable writeups phrase the
   library-vs-integration responsibility split? The repo currently claims:
   the validators are not defective; the vulnerability arises from combining
   permissive record validation with an unsafe normalizer. Check this against
   how prior disclosures assign responsibility.

## 5. Boundaries for the research agent

- Do not treat anything in section 3 as established; it is the hypothesis to
  validate or correct.
- Do not cite fixture-derived numbers from any source application; all
  payloads here are synthetic by construction.
- The repo intentionally retains the vulnerable normalizer; research output
  should inform remediation options, not silently change benchmark behavior.
- When citing CVEs or tool rules, verify the mechanism matches (key
  retention vs. sink) rather than pattern-matching on the word
  "prototype pollution".
