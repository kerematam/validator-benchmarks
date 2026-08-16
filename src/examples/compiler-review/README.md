# Simple Generated Validator Review

This example defines one equivalent strict schema in Zod, JSON Schema for Ajv,
and TypeBox. It emits small generated validators so their implementation styles
can be inspected without the full structured-report contract.

The synthetic item contract requires:

- a non-empty string `id`;
- a non-negative integer `count`;
- a boolean `active`;
- an array of at most three string `tags`; and
- no unknown object properties.

## Source schemas

| Validator | Schema source | Compilation model |
| --- | --- | --- |
| Zod Compiler | [`zod-schema.ts`](./zod-schema.ts) | Ahead-of-time Bun build plugin |
| Ajv | [`ajv-schema.ts`](./ajv-schema.ts) | Standalone code generation during this review build |
| TypeBox | [`typebox-schema.ts`](./typebox-schema.ts) | JIT code generation exposed through `Validator.Code()` |

## Build

From the repository root:

```sh
bun run build:compiler-review
```

The command writes these gitignored local inspection artifacts:

```text
.generated/simple-validator-review/
  zod-compiled-entry.js
  ajv-standalone.js
  typebox-generated.js
  build-summary.json
```

The build imports all three generated modules and verifies the same valid and
invalid cases against each. It fails if Zod lacks the compiler marker, TypeBox
is not accelerated, a module cannot execute, or their verdicts differ.

This example is for code review only. It performs no timing and makes no
performance claim.

## What to compare

- Zod Compiler retains a Zod-compatible schema object and installs generated
  `parse`, `safeParse`, and `is` behavior around specialized checks.
- Ajv emits a standalone module containing direct checks plus detailed error
  construction.
- TypeBox emits a compact boolean predicate. Its raw generated body expects
  compiler-supplied helper bindings; the saved review module imports the public
  `typebox/guard` helper used by this schema. Detailed TypeBox errors use a
  separate runtime path and are intentionally absent from the generated check.

The normal benchmark compiles Ajv and TypeBox in memory during unmeasured
warm-up. This example explicitly saves their generated source only to make it
easy to inspect.
