import type { ZodType } from "zod-4-4";
import {
  DiagnosticManualNormalizerStructuredReportRequestSchema,
  ManualNormalizerStructuredReportRequestSchema,
} from "../contract/zod-4-4-manual-normalizer-schema";
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

function validateWithSeparateNormalization(
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

export function validateZod44SeparateNormalization(
  input: unknown,
): ValidationResult {
  return validateWithSeparateNormalization(
    ManualNormalizerStructuredReportRequestSchema,
    input,
  );
}

export function validateDiagnosticZod44SeparateNormalization(
  input: unknown,
): ValidationResult {
  return validateWithSeparateNormalization(
    DiagnosticManualNormalizerStructuredReportRequestSchema,
    input,
  );
}

export const zod44SeparateNormalizationAdapter: ValidatorAdapter = {
  name: "zod-4.4-separate-normalization",
  inputOwnership: "mutate",
  validate: validateZod44SeparateNormalization,
};

export const diagnosticZod44SeparateNormalizationAdapter: ValidatorAdapter = {
  name: "zod-4.4-separate-normalization",
  inputOwnership: "mutate",
  validate: validateDiagnosticZod44SeparateNormalization,
};
