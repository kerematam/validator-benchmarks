import { mkdir, writeFile } from "node:fs/promises";
import { basename, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import zodCompiler from "zod-compiler/bun";

const DiagnosticsSchema = z.array(
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
          eligible: z.literal(true),
          blocker: z.never().optional(),
        }),
        fallbacks: z.array(z.unknown()).length(0),
      }),
    ),
  }),
);

const EXPECTED_SCHEMAS = new Set([
  "DiagnosticManualNormalizerStructuredReportRequestSchema",
  "ManualNormalizerStructuredReportRequestSchema",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readDiagnostics(): Promise<z.infer<typeof DiagnosticsSchema>> {
  const child = Bun.spawn(
    [
      Bun.argv[0] ?? "bun",
      "x",
      "zod-compiler",
      "check",
      "src/contract/zod-manual-normalizer-schema.ts",
      "--json",
      "--fail-under",
      "100",
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  if (exitCode !== 0) {
    throw new Error(`Manual-normalizer compiler check failed: ${stderr.trim()}`);
  }
  const input: unknown = JSON.parse(stdout);
  const diagnostics = DiagnosticsSchema.parse(input);
  const names = new Set(
    diagnostics.flatMap((file) => file.schemas.map((schema) => schema.exportName)),
  );
  if (
    names.size !== EXPECTED_SCHEMAS.size ||
    [...EXPECTED_SCHEMAS].some((name) => !names.has(name))
  ) {
    throw new Error("Manual-normalizer diagnostics did not cover both schemas");
  }
  return diagnostics;
}

async function main(): Promise<void> {
  const diagnostics = await readDiagnostics();
  const outputDirectory = resolve("dist/compiled-zod-manual-normalizer");
  await mkdir(outputDirectory, { recursive: true });
  const startedAt = performance.now();
  const result = await Bun.build({
    entrypoints: [
      resolve("src/validators/compiled-zod-manual-normalizer-entry.ts"),
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
        include: ["**/src/contract/zod-manual-normalizer-schema.ts"],
        verbose: true,
      }),
    ],
  });
  const buildMilliseconds = performance.now() - startedAt;
  if (!result.success) {
    throw new Error(
      `Compiled manual-normalizer build failed: ${result.logs.map(String).join("; ")}`,
    );
  }
  const artifact = result.outputs.find(
    (output) =>
      basename(output.path) === "compiled-zod-manual-normalizer-entry.js",
  );
  if (artifact === undefined) {
    throw new Error("Compiled manual-normalizer entrypoint was not emitted");
  }
  const loaded: unknown = await import(
    `${pathToFileURL(artifact.path).href}?build=${Date.now()}`
  );
  if (!isRecord(loaded)) {
    throw new Error("Compiled manual-normalizer artifact is invalid");
  }
  for (const exportName of EXPECTED_SCHEMAS) {
    const schema = loaded[exportName];
    if (!isRecord(schema) || typeof schema.is !== "function") {
      throw new Error(`Compiled marker is missing for ${exportName}`);
    }
  }

  const report = {
    status: "pass",
    experiment: "raw-manual-normalizer",
    packages: "external",
    fastPathEligible: true,
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
  console.log(JSON.stringify(report));
}

await main();
