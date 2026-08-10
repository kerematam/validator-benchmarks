import { mkdir, writeFile } from "node:fs/promises";
import { basename, relative, resolve } from "node:path";
import zodCompiler from "zod-compiler/bun";

async function main(): Promise<void> {
  const outputDirectory = resolve("dist/compiled-zod-bundled");
  await mkdir(outputDirectory, { recursive: true });
  const result = await Bun.build({
    entrypoints: [resolve("src/validators/compiled-zod-entry.ts")],
    outdir: outputDirectory,
    target: "bun",
    format: "esm",
    packages: "bundle",
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
  if (!result.success) {
    throw new Error(
      `Fully bundled build failed: ${result.logs.map(String).join("; ")}`,
    );
  }

  const artifact = result.outputs.find(
    (output) => basename(output.path) === "compiled-zod-entry.js",
  );
  if (artifact === undefined) {
    throw new Error("Fully bundled build did not emit its entrypoint");
  }

  const probe = Bun.spawn(
    [
      Bun.argv[0] ?? "bun",
      "run",
      "src/build/probe-compiled-artifact.ts",
      artifact.path,
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [probeExitCode] = await Promise.all([
    probe.exited,
    new Response(probe.stdout).text(),
    new Response(probe.stderr).text(),
  ]);
  const report = {
    status: "pass",
    packages: "bundle",
    artifact: relative(process.cwd(), artifact.path),
    artifactBytes: artifact.size,
    runtimeCompatible: probeExitCode === 0,
    probeExitCode,
  };
  await writeFile(
    resolve(outputDirectory, "compatibility.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  console.log(JSON.stringify(report));
}

await main();
