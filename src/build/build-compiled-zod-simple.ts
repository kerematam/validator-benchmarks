import { mkdir } from "node:fs/promises";
import { basename, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import zodCompiler from "zod-compiler/bun";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function main(): Promise<void> {
  const outputDirectory = resolve("dist/compiled-zod-simple");
  await mkdir(outputDirectory, { recursive: true });
  const startedAt = performance.now();
  const result = await Bun.build({
    entrypoints: [resolve("src/validators/compiled-zod-simple-entry.ts")],
    outdir: outputDirectory,
    target: "bun",
    format: "esm",
    packages: "external",
    sourcemap: "none",
    minify: false,
    plugins: [
      zodCompiler({
        cache: false,
        include: ["**/src/contract/simple-zod-schema.ts"],
        verbose: true,
      }),
    ],
  });
  const buildMilliseconds = performance.now() - startedAt;
  if (!result.success) {
    throw new Error(
      `Compiled simple Zod build failed: ${result.logs.map(String).join("; ")}`,
    );
  }

  const artifact = result.outputs.find(
    (output) => basename(output.path) === "compiled-zod-simple-entry.js",
  );
  if (artifact === undefined) {
    throw new Error("Compiled simple Zod build did not emit its entrypoint");
  }

  const moduleExports: unknown = await import(
    `${pathToFileURL(artifact.path).href}?build=${Date.now()}`
  );
  if (!isRecord(moduleExports)) {
    throw new Error("Compiled simple artifact did not export a module object");
  }
  const schema = moduleExports.SimpleRecordSchema;
  if (!isRecord(schema) || typeof schema.is !== "function") {
    throw new Error(
      "Compiled simple schema marker is missing; refusing an uncompiled fallback",
    );
  }

  console.log(
    JSON.stringify({
      status: "pass",
      packages: "external",
      artifact: relative(process.cwd(), artifact.path),
      artifactBytes: artifact.size,
      buildMilliseconds,
    }),
  );
}

await main();
