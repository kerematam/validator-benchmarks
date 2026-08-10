import {
  DiagnosticStructuredReportRequestSchema,
  StructuredReportRequestSchema,
} from "../contract/zod-schema";
import {
  normalizedIssueFromZod,
  sortNormalizedIssues,
  type ValidationResult,
  type ValidatorAdapter,
} from "../contract/normalized-issue";

export function validateCurrentZod(input: unknown): ValidationResult {
  const result = StructuredReportRequestSchema.safeParse(input);
  if (result.success) {
    return {
      success: true,
      data: result.data,
      nativeIssues: [],
    };
  }

  return {
    success: false,
    issues: sortNormalizedIssues(result.error.issues.map(normalizedIssueFromZod)),
    nativeIssues: result.error.issues,
  };
}

export function validateDiagnosticCurrentZod(input: unknown): ValidationResult {
  const result = DiagnosticStructuredReportRequestSchema.safeParse(input);
  if (result.success) {
    return {
      success: true,
      data: result.data,
      nativeIssues: [],
    };
  }

  return {
    success: false,
    issues: sortNormalizedIssues(result.error.issues.map(normalizedIssueFromZod)),
    nativeIssues: result.error.issues,
  };
}

export const currentZodAdapter: ValidatorAdapter = {
  name: "current-zod",
  inputOwnership: "clone",
  validate: validateCurrentZod,
};

export const diagnosticCurrentZodAdapter: ValidatorAdapter = {
  name: "current-zod",
  inputOwnership: "clone",
  validate: validateDiagnosticCurrentZod,
};
