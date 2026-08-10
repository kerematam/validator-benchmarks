import type { ZodType } from "zod";
import {
  DiagnosticManualNormalizerStructuredReportRequestSchema,
  ManualNormalizerStructuredReportRequestSchema,
} from "../contract/zod-manual-normalizer-schema";
import {
  normalizedIssueFromZod,
  sortNormalizedIssues,
  type ValidationResult,
  type ValidatorAdapter,
} from "../contract/normalized-issue";
import {
  normalizeRequestInPlace,
  prepareRequestInPlace,
} from "./contract-runtime";

function validateWithManualNormalizer(
  schema: ZodType,
  input: unknown,
): ValidationResult {
  const prepared = prepareRequestInPlace(input);
  const result = schema.safeParse(prepared);
  if (!result.success) {
    return {
      success: false,
      issues: sortNormalizedIssues(
        result.error.issues.map(normalizedIssueFromZod),
      ),
      nativeIssues: result.error.issues,
    };
  }

  const normalized = normalizeRequestInPlace(result.data);
  if (normalized.issues.length > 0) {
    return {
      success: false,
      issues: sortNormalizedIssues(normalized.issues),
      nativeIssues: normalized.issues,
    };
  }
  return { success: true, data: normalized.data, nativeIssues: [] };
}

export function validateCurrentZodManualNormalizer(
  input: unknown,
): ValidationResult {
  return validateWithManualNormalizer(
    ManualNormalizerStructuredReportRequestSchema,
    input,
  );
}

export function validateDiagnosticCurrentZodManualNormalizer(
  input: unknown,
): ValidationResult {
  return validateWithManualNormalizer(
    DiagnosticManualNormalizerStructuredReportRequestSchema,
    input,
  );
}

export const currentZodManualNormalizerAdapter: ValidatorAdapter = {
  name: "zod-manual-normalizer",
  inputOwnership: "mutate",
  validate: validateCurrentZodManualNormalizer,
};

export const diagnosticCurrentZodManualNormalizerAdapter: ValidatorAdapter = {
  name: "zod-manual-normalizer",
  inputOwnership: "mutate",
  validate: validateDiagnosticCurrentZodManualNormalizer,
};
