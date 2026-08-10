import type { ValidationResult } from "../contract/normalized-issue";
import {
  validateCurrentZodManualNormalizer,
  validateDiagnosticCurrentZodManualNormalizer,
} from "./current-zod-manual-normalizer";

export {
  DiagnosticManualNormalizerStructuredReportRequestSchema,
  ManualNormalizerStructuredReportRequestSchema,
} from "../contract/zod-manual-normalizer-schema";

export function validateCompiledZodManualNormalizer(
  input: unknown,
): ValidationResult {
  return validateCurrentZodManualNormalizer(input);
}

export function validateDiagnosticCompiledZodManualNormalizer(
  input: unknown,
): ValidationResult {
  return validateDiagnosticCurrentZodManualNormalizer(input);
}
