import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { structuredReportRequestSchemaForEnvelope } from "../contract/zod-schema";
import {
  GeneratedProfileManifestSchema,
  verifyProfileManifest,
} from "../generator/manifest";
import { getSyntheticProfile } from "../generator/profiles";
import {
  auditSyntheticVocabulary,
  formatAuditPath,
} from "./synthetic-vocabulary";

interface AuditedProfileCounts {
  readonly profile: string;
  readonly reportCount: number;
  readonly keyCount: number;
  readonly stringCount: number;
}

async function auditGeneratedDirectory(
  generatedRoot: string,
): Promise<readonly AuditedProfileCounts[]> {
  const entries = await readdir(generatedRoot, { withFileTypes: true });
  const directories = entries.filter((entry) => entry.isDirectory());
  const unexpectedEntries = entries.filter(
    (entry) => !entry.isDirectory() || entry.isSymbolicLink(),
  );

  if (unexpectedEntries.length > 0) {
    throw new Error("Generated root contains an unexpected file or link");
  }
  if (directories.length === 0) {
    throw new Error("No generated profiles were found to audit");
  }

  const counts: AuditedProfileCounts[] = [];
  for (const directory of directories.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const profileDirectory = join(generatedRoot, directory.name);
    const [requestText, manifestText] = await Promise.all([
      readFile(join(profileDirectory, "request.json"), "utf8"),
      readFile(join(profileDirectory, "manifest.json"), "utf8"),
    ]);
    const request: unknown = JSON.parse(requestText);
    const manifestInput: unknown = JSON.parse(manifestText);
    const manifestResult = GeneratedProfileManifestSchema.safeParse(manifestInput);
    if (!manifestResult.success) {
      throw new Error("A generated manifest is invalid");
    }

    const manifestIssues = verifyProfileManifest(
      request,
      requestText,
      manifestResult.data,
    );
    if (manifestIssues.length > 0) {
      throw new Error(
        `Generated manifest verification failed: ${manifestIssues.join(", ")}`,
      );
    }

    const profile = getSyntheticProfile(manifestResult.data.profile);
    const contractResult = structuredReportRequestSchemaForEnvelope(
      profile.validationEnvelope,
    ).safeParse(request);
    if (!contractResult.success) {
      throw new Error("A generated request failed the current-Zod contract gate");
    }

    const vocabularyResult = auditSyntheticVocabulary(request);
    if (!vocabularyResult.passed) {
      const safeIssues = vocabularyResult.issues
        .map((issue) => `${issue.kind}:${formatAuditPath(issue.path)}`)
        .join(", ");
      throw new Error(`Synthetic vocabulary audit failed: ${safeIssues}`);
    }

    counts.push({
      profile: manifestResult.data.profile,
      reportCount: manifestResult.data.reportCount,
      keyCount: vocabularyResult.keyCount,
      stringCount: vocabularyResult.stringCount,
    });
  }

  return counts;
}

const auditedProfiles = await auditGeneratedDirectory(".generated");
console.log(
  JSON.stringify({
    status: "pass",
    profileCount: auditedProfiles.length,
    reportCount: auditedProfiles.reduce(
      (total, profile) => total + profile.reportCount,
      0,
    ),
    keyCount: auditedProfiles.reduce(
      (total, profile) => total + profile.keyCount,
      0,
    ),
    stringCount: auditedProfiles.reduce(
      (total, profile) => total + profile.stringCount,
      0,
    ),
  }),
);
