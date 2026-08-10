import { pathToFileURL } from "node:url";
import type { ValidationEnvelope } from "../contract/limits";
import {
  type NormalizedIssue,
  type NormalizedIssueCategory,
  type ValidationResult,
  type ValidatorAdapter,
} from "../contract/normalized-issue";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCategory(value: unknown): value is NormalizedIssueCategory {
  return (
    value === "invalid_type" ||
    value === "non_blank" ||
    value === "too_big" ||
    value === "too_small" ||
    value === "unrecognized_keys"
  );
}

function readIssue(value: unknown): NormalizedIssue | undefined {
  if (
    !isRecord(value) ||
    !isCategory(value.category) ||
    !Array.isArray(value.path) ||
    value.path.some(
      (segment) => typeof segment !== "string" && typeof segment !== "number",
    )
  ) {
    return undefined;
  }
  return { category: value.category, path: value.path };
}

function readResult(value: unknown): ValidationResult {
  if (!isRecord(value) || !Array.isArray(value.nativeIssues)) {
    throw new Error("Compiled manual-normalizer adapter returned an invalid result");
  }
  if (value.success === true) {
    return { success: true, data: value.data, nativeIssues: value.nativeIssues };
  }
  if (value.success !== false || !Array.isArray(value.issues)) {
    throw new Error("Compiled manual-normalizer adapter returned an invalid verdict");
  }
  const issues: NormalizedIssue[] = [];
  for (const issue of value.issues) {
    const parsed = readIssue(issue);
    if (parsed === undefined) {
      throw new Error("Compiled manual-normalizer adapter returned an invalid issue");
    }
    issues.push(parsed);
  }
  return { success: false, issues, nativeIssues: value.nativeIssues };
}

export async function loadCompiledZodManualNormalizerAdapter(
  artifactPath: string,
  envelope: ValidationEnvelope = "production",
): Promise<ValidatorAdapter> {
  const loaded: unknown = await import(
    `${pathToFileURL(artifactPath).href}?load=${Date.now()}`
  );
  if (!isRecord(loaded)) {
    throw new Error("Compiled manual-normalizer artifact is invalid");
  }
  const schema =
    envelope === "production"
      ? loaded.ManualNormalizerStructuredReportRequestSchema
      : loaded.DiagnosticManualNormalizerStructuredReportRequestSchema;
  if (!isRecord(schema) || typeof schema.is !== "function") {
    throw new Error("Compiled manual-normalizer schema marker is missing");
  }
  const validate =
    envelope === "production"
      ? loaded.validateCompiledZodManualNormalizer
      : loaded.validateDiagnosticCompiledZodManualNormalizer;
  if (typeof validate !== "function") {
    throw new Error("Compiled manual-normalizer validate function is missing");
  }
  return {
    name: "compiled-zod-manual-normalizer",
    inputOwnership: "mutate",
    validate(input: unknown): ValidationResult {
      return readResult(Reflect.apply(validate, undefined, [input]));
    },
  };
}

export function loadDiagnosticCompiledZodManualNormalizerAdapter(
  artifactPath: string,
): Promise<ValidatorAdapter> {
  return loadCompiledZodManualNormalizerAdapter(artifactPath, "diagnostic");
}
