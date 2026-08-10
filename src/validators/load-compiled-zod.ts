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

function isNormalizedCategory(
  value: unknown,
): value is NormalizedIssueCategory {
  return (
    value === "invalid_type" ||
    value === "non_blank" ||
    value === "too_big" ||
    value === "too_small" ||
    value === "unrecognized_keys"
  );
}

function readNormalizedIssue(value: unknown): NormalizedIssue | undefined {
  if (
    !isRecord(value) ||
    !isNormalizedCategory(value.category) ||
    !Array.isArray(value.path) ||
    value.path.some(
      (segment) => typeof segment !== "string" && typeof segment !== "number",
    )
  ) {
    return undefined;
  }

  return {
    category: value.category,
    path: value.path,
  };
}

function readValidationResult(value: unknown): ValidationResult {
  if (!isRecord(value) || !Array.isArray(value.nativeIssues)) {
    throw new Error("Compiled adapter returned an invalid result envelope");
  }
  if (value.success === true) {
    return {
      success: true,
      data: value.data,
      nativeIssues: value.nativeIssues,
    };
  }
  if (value.success !== false || !Array.isArray(value.issues)) {
    throw new Error("Compiled adapter returned an invalid result verdict");
  }

  const issues: NormalizedIssue[] = [];
  for (const issue of value.issues) {
    const parsedIssue = readNormalizedIssue(issue);
    if (parsedIssue === undefined) {
      throw new Error("Compiled adapter returned an invalid normalized issue");
    }
    issues.push(parsedIssue);
  }

  return {
    success: false,
    issues,
    nativeIssues: value.nativeIssues,
  };
}

export async function loadCompiledZodAdapter(
  artifactPath: string,
  envelope: ValidationEnvelope = "production",
): Promise<ValidatorAdapter> {
  const loaded: unknown = await import(
    `${pathToFileURL(artifactPath).href}?load=${Date.now()}`
  );
  if (!isRecord(loaded)) {
    throw new Error("Compiled artifact did not export a module object");
  }
  const schema =
    envelope === "production"
      ? loaded.StructuredReportRequestSchema
      : loaded.DiagnosticStructuredReportRequestSchema;
  if (!isRecord(schema) || typeof schema.is !== "function") {
    throw new Error("Compiled schema marker is missing");
  }
  const validate =
    envelope === "production"
      ? loaded.validateCompiledZod
      : loaded.validateDiagnosticCompiledZod;
  if (typeof validate !== "function") {
    throw new Error("Compiled artifact did not export validateCompiledZod");
  }

  return {
    name: "compiled-zod",
    inputOwnership: "clone",
    validate(input: unknown): ValidationResult {
      return readValidationResult(Reflect.apply(validate, undefined, [input]));
    },
  };
}
