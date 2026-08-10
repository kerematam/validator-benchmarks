import { mkdir, writeFile } from "node:fs/promises";
import { basename, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import zodCompiler from "zod-compiler/bun";

const CompilerDiagnosticsSchema = z.array(
  z.strictObject({
    file: z.string(),
    schemas: z.array(
      z.strictObject({
        exportName: z.string(),
        coverage: z.strictObject({
          total: z.number().int().positive(),
          compilable: z.number().int().positive(),
          percent: z.literal(100),
        }),
        fastPath: z.strictObject({
          eligible: z.boolean(),
          blocker: z.string().optional(),
        }),
        fallbacks: z.array(z.unknown()),
      }),
    ),
  }),
);

const EXPECTED_SCHEMAS = new Set([
  "DiagnosticStructuredReportRequestSchema",
  "StructuredReportBusinessObjectSchema",
  "StructuredReportCellSchema",
  "StructuredReportColumnSchema",
  "StructuredReportHeaderSchema",
  "StructuredReportRequestSchema",
  "StructuredReportRowSchema",
  "StructuredReportSchema",
  "StructuredReportTableSchema",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readCompilerDiagnostics(): Promise<
  z.infer<typeof CompilerDiagnosticsSchema>
> {
  const process = Bun.spawn(
    [
      Bun.argv[0] ?? "bun",
      "x",
      "zod-compiler",
      "check",
      "src/contract/zod-schema.ts",
      "--json",
      "--fail-under",
      "100",
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [exitCode, stdout, stderr] = await Promise.all([
    process.exited,
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
  ]);
  if (exitCode !== 0) {
    throw new Error(`zod-compiler check failed: ${stderr.trim()}`);
  }

  const parsedJson: unknown = JSON.parse(stdout);
  const diagnostics = CompilerDiagnosticsSchema.parse(parsedJson);
  const schemaNames = new Set(
    diagnostics.flatMap((file) =>
      file.schemas.map((schema) => schema.exportName),
    ),
  );
  if (
    schemaNames.size !== EXPECTED_SCHEMAS.size ||
    [...EXPECTED_SCHEMAS].some((name) => !schemaNames.has(name))
  ) {
    throw new Error("Compiler diagnostics did not cover every intended schema");
  }

  return diagnostics;
}

async function loadCompiledArtifact(
  artifactPath: string,
): Promise<Record<string, unknown>> {
  const loaded: unknown = await import(
    `${pathToFileURL(artifactPath).href}?build=${Date.now()}`
  );
  if (!isRecord(loaded)) {
    throw new Error("Compiled artifact did not export a module object");
  }
  return loaded;
}

function readValidationFunction(
  moduleExports: Record<string, unknown>,
  exportName: "validateCompiledZod" | "validateDiagnosticCompiledZod",
): (input: unknown) => unknown {
  const candidate = moduleExports[exportName];
  if (typeof candidate !== "function") {
    throw new Error("Compiled artifact did not export validateCompiledZod");
  }
  return (input: unknown): unknown => Reflect.apply(candidate, undefined, [input]);
}

function assertCompilerMarkers(moduleExports: Record<string, unknown>): void {
  for (const exportName of [
    "StructuredReportRequestSchema",
    "DiagnosticStructuredReportRequestSchema",
  ]) {
    const schema = moduleExports[exportName];
    if (!isRecord(schema) || typeof schema.is !== "function") {
      throw new Error(
        `Compiled schema marker is missing for ${exportName}; refusing an uncompiled fallback`,
      );
    }
  }
}

async function main(): Promise<void> {
  const diagnostics = await readCompilerDiagnostics();
  const outputDirectory = resolve("dist/compiled-zod-external");
  await mkdir(outputDirectory, { recursive: true });
  const startedAt = performance.now();
  const result = await Bun.build({
    entrypoints: [resolve("src/validators/compiled-zod-entry.ts")],
    outdir: outputDirectory,
    target: "bun",
    format: "esm",
    packages: "external",
    sourcemap: "none",
    minify: false,
    plugins: [
      zodCompiler({
        cache: false,
        include: ["**/src/contract/zod-schema.ts"],
        verbose: true,
      }),
    ],
  });
  const buildMilliseconds = performance.now() - startedAt;
  if (!result.success) {
    throw new Error(
      `Compiled Zod build failed: ${result.logs.map(String).join("; ")}`,
    );
  }

  const artifact = result.outputs.find(
    (output) => basename(output.path) === "compiled-zod-entry.js",
  );
  if (artifact === undefined) {
    throw new Error("Compiled Zod build did not emit its entrypoint");
  }

  const moduleExports = await loadCompiledArtifact(artifact.path);
  assertCompilerMarkers(moduleExports);
  const productionValidate = readValidationFunction(
    moduleExports,
    "validateCompiledZod",
  );
  const diagnosticValidate = readValidationFunction(
    moduleExports,
    "validateDiagnosticCompiledZod",
  );
  const smokeInput = {
    data: [
      {
        header: {},
        businessObject: { name: "Synthetic Build Object" },
        table: { columns: [{ key: "synthetic_column_01" }], rows: [] },
      },
    ],
  };
  for (const validate of [productionValidate, diagnosticValidate]) {
    const smokeResult = validate(smokeInput);
    if (!isRecord(smokeResult) || smokeResult.success !== true) {
      throw new Error("Compiled Zod artifact failed its valid smoke request");
    }
  }

  const report = {
    status: "pass",
    packages: "external",
    artifact: relative(process.cwd(), artifact.path),
    artifactBytes: artifact.size,
    buildMilliseconds,
    optimizedSchemas: [...EXPECTED_SCHEMAS].sort(),
    diagnostics,
  };
  await writeFile(
    resolve(outputDirectory, "build-diagnostics.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  console.log(
    JSON.stringify({
      status: report.status,
      packages: report.packages,
      artifact: report.artifact,
      artifactBytes: report.artifactBytes,
      optimizedSchemaCount: report.optimizedSchemas.length,
    }),
  );
}

await main();
