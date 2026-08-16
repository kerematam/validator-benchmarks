import { mkdir, stat, writeFile } from "node:fs/promises";
import { basename, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import Ajv from "ajv";
import standaloneCode from "ajv/dist/standalone/index.js";
import Compile from "typebox/compile";
import zodCompiler from "zod-compiler/bun";
import { SIMPLE_ITEM_AJV_SCHEMA } from "./ajv-schema";
import { SimpleItemTypeBoxSchema } from "./typebox-schema";

interface ReviewCase {
  readonly label: string;
  readonly input: unknown;
  readonly expected: boolean;
}

const REVIEW_CASES: readonly ReviewCase[] = [
  {
    label: "valid",
    input: {
      id: "SYNTHETIC-ITEM-001",
      count: 2,
      active: true,
      tags: ["ALPHA", "BETA"],
    },
    expected: true,
  },
  {
    label: "empty id",
    input: { id: "", count: 2, active: true, tags: [] },
    expected: false,
  },
  {
    label: "negative count",
    input: { id: "SYNTHETIC-ITEM-002", count: -1, active: true, tags: [] },
    expected: false,
  },
  {
    label: "non-integer count",
    input: { id: "SYNTHETIC-ITEM-003", count: 1.5, active: true, tags: [] },
    expected: false,
  },
  {
    label: "too many tags",
    input: {
      id: "SYNTHETIC-ITEM-004",
      count: 0,
      active: false,
      tags: ["ALPHA", "BETA", "GAMMA", "DELTA"],
    },
    expected: false,
  },
  {
    label: "unknown key",
    input: {
      id: "SYNTHETIC-ITEM-005",
      count: 0,
      active: false,
      tags: [],
      extra: "SYNTHETIC-EXTRA",
    },
    expected: false,
  },
];

type BooleanValidator = (input: unknown) => boolean;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function loadModule(modulePath: string): Promise<Record<string, unknown>> {
  const loaded: unknown = await import(
    `${pathToFileURL(modulePath).href}?review=${Date.now()}`
  );
  if (!isRecord(loaded)) {
    throw new Error(`Generated module is not an object: ${modulePath}`);
  }
  return loaded;
}

function readBooleanFunction(
  moduleExports: Record<string, unknown>,
  exportName: string,
): BooleanValidator {
  const candidate = moduleExports[exportName];
  if (typeof candidate !== "function") {
    throw new Error(`Generated module is missing function ${exportName}`);
  }

  return (input: unknown): boolean => {
    const result: unknown = Reflect.apply(candidate, undefined, [input]);
    if (typeof result !== "boolean") {
      throw new Error(`${exportName} did not return a boolean`);
    }
    return result;
  };
}

function readZodIsFunction(
  moduleExports: Record<string, unknown>,
): BooleanValidator {
  const schema = moduleExports.SimpleItemZodSchema;
  if (!isRecord(schema)) {
    throw new Error("Compiled Zod module is missing SimpleItemZodSchema");
  }
  const candidate = schema.is;
  if (typeof candidate !== "function") {
    throw new Error(
      "Compiled Zod marker is missing; refusing an ordinary-Zod fallback",
    );
  }

  return (input: unknown): boolean => {
    const result: unknown = Reflect.apply(candidate, schema, [input]);
    if (typeof result !== "boolean") {
      throw new Error("Compiled Zod .is() did not return a boolean");
    }
    return result;
  };
}

function verifyValidator(name: string, validate: BooleanValidator): void {
  for (const reviewCase of REVIEW_CASES) {
    const actual = validate(reviewCase.input);
    if (actual !== reviewCase.expected) {
      throw new Error(
        `${name} returned ${String(actual)} for ${reviewCase.label}; expected ${String(reviewCase.expected)}`,
      );
    }
  }
}

function indent(source: string): string {
  return source
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
}

async function main(): Promise<void> {
  const outputDirectory = resolve(".generated/simple-validator-review");
  await mkdir(outputDirectory, { recursive: true });

  const zodBuild = await Bun.build({
    entrypoints: [
      resolve("src/examples/compiler-review/zod-compiled-entry.ts"),
    ],
    outdir: outputDirectory,
    target: "bun",
    format: "esm",
    packages: "external",
    sourcemap: "none",
    minify: false,
    plugins: [
      zodCompiler({
        cache: false,
        include: ["**/src/examples/compiler-review/zod-schema.ts"],
        verbose: true,
      }),
    ],
  });
  if (!zodBuild.success) {
    throw new Error(
      `Simple Zod compilation failed: ${zodBuild.logs.map(String).join("; ")}`,
    );
  }
  const zodArtifact = zodBuild.outputs.find(
    (output) => basename(output.path) === "zod-compiled-entry.js",
  );
  if (zodArtifact === undefined) {
    throw new Error("Simple Zod compilation did not emit its entrypoint");
  }

  const ajv = new Ajv({
    allErrors: true,
    strict: true,
    code: {
      source: true,
      esm: true,
      lines: true,
      optimize: false,
    },
  });
  const ajvValidator = ajv.compile<unknown>(SIMPLE_ITEM_AJV_SCHEMA);
  const ajvSource = standaloneCode(ajv, ajvValidator);
  const ajvArtifactPath = resolve(outputDirectory, "ajv-standalone.js");
  await writeFile(ajvArtifactPath, `${ajvSource}\n`, "utf8");

  const typeBoxValidator = Compile(SimpleItemTypeBoxSchema);
  if (!typeBoxValidator.IsAccelerated()) {
    throw new Error("Simple TypeBox validator is not accelerated");
  }
  const typeBoxGeneratedBody = typeBoxValidator.Code();
  const typeBoxSource = [
    "// TypeBox returns a generated function body from Validator.Code().",
    "// This wrapper supplies the public Guard helper used by this schema",
    "// and turns the generated body into a reviewable ESM module.",
    'import Guard from "typebox/guard";',
    "",
    "export const validateSimpleItem = (() => {",
    indent(typeBoxGeneratedBody),
    "})();",
    "",
  ].join("\n");
  const typeBoxArtifactPath = resolve(
    outputDirectory,
    "typebox-generated.js",
  );
  await writeFile(typeBoxArtifactPath, typeBoxSource, "utf8");

  const zodModule = await loadModule(zodArtifact.path);
  const ajvModule = await loadModule(ajvArtifactPath);
  const typeBoxModule = await loadModule(typeBoxArtifactPath);
  verifyValidator("zod-compiler", readZodIsFunction(zodModule));
  verifyValidator("Ajv", readBooleanFunction(ajvModule, "default"));
  verifyValidator(
    "TypeBox",
    readBooleanFunction(typeBoxModule, "validateSimpleItem"),
  );

  const artifactPaths = [
    zodArtifact.path,
    ajvArtifactPath,
    typeBoxArtifactPath,
  ];
  const artifacts = await Promise.all(
    artifactPaths.map(async (artifactPath) => ({
      path: relative(process.cwd(), artifactPath),
      bytes: (await stat(artifactPath)).size,
    })),
  );
  const summary = {
    status: "pass",
    purpose: "readable generated-validator review; not a benchmark",
    contract: {
      strictObject: true,
      required: ["id", "count", "active", "tags"],
      rules: {
        id: "non-empty string",
        count: "non-negative integer",
        active: "boolean",
        tags: "array of at most three strings",
      },
    },
    verifiedCases: REVIEW_CASES.map(({ label, expected }) => ({
      label,
      expected,
    })),
    artifacts,
  };
  const summaryPath = resolve(outputDirectory, "build-summary.json");
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...summary, summary: relative(process.cwd(), summaryPath) }));
}

await main();
