import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { structuredReportRequestSchemaForEnvelope } from "../contract/zod-schema";
import { generateSyntheticProfile } from "./generate";
import {
  getSyntheticProfile,
  SyntheticProfileNameSchema,
} from "./profiles";

const GeneratorArgumentsSchema = z.strictObject({
  profile: SyntheticProfileNameSchema.default("smoke"),
  seed: z.coerce.number().int().min(0).max(0xffff_ffff).default(20_260_807),
});

function readArguments(argumentsToParse: readonly string[]): unknown {
  const values: Record<string, string> = {};

  for (let index = 0; index < argumentsToParse.length; index += 1) {
    const flag = argumentsToParse[index];
    if (flag !== "--profile" && flag !== "--seed") {
      throw new Error(`Unknown generator argument at position ${index + 1}`);
    }

    const value = argumentsToParse[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for generator argument at position ${index + 1}`);
    }
    if (values[flag] !== undefined) {
      throw new Error(`Duplicate generator argument at position ${index + 1}`);
    }

    values[flag] = value;
    index += 1;
  }

  return {
    profile: values["--profile"],
    seed: values["--seed"],
  };
}

async function main(): Promise<void> {
  const argumentsResult = GeneratorArgumentsSchema.safeParse(
    readArguments(Bun.argv.slice(2)),
  );
  if (!argumentsResult.success) {
    throw new Error("Generator arguments are invalid");
  }

  const generated = generateSyntheticProfile(
    argumentsResult.data.profile,
    argumentsResult.data.seed,
  );
  const profile = getSyntheticProfile(argumentsResult.data.profile);
  const contractResult = structuredReportRequestSchemaForEnvelope(
    profile.validationEnvelope,
  ).safeParse(generated.request);
  if (!contractResult.success) {
    throw new Error("Generated request failed the current-Zod contract gate");
  }

  const directoryName = `${argumentsResult.data.profile}-seed-${argumentsResult.data.seed}`;
  const relativeDirectory = join(".generated", directoryName);
  await mkdir(relativeDirectory, { recursive: true });
  await Promise.all([
    writeFile(join(relativeDirectory, "request.json"), generated.json, "utf8"),
    writeFile(
      join(relativeDirectory, "manifest.json"),
      `${JSON.stringify(generated.manifest, null, 2)}\n`,
      "utf8",
    ),
  ]);

  console.log(
    JSON.stringify({
      status: "generated",
      profile: generated.manifest.profile,
      seed: generated.manifest.seed,
      reportCount: generated.manifest.reportCount,
      encodedBytes: generated.manifest.encodedBytes,
      sha256: generated.manifest.sha256,
      directory: relativeDirectory,
    }),
  );
}

await main();
