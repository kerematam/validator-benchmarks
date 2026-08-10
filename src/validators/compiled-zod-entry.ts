import type {
  ValidationResult,
  ValidatorAdapter,
} from "../contract/normalized-issue";
import {
  validateCurrentZod,
  validateDiagnosticCurrentZod,
} from "./current-zod";

export {
  DiagnosticStructuredReportRequestSchema,
  StructuredReportRequestSchema,
} from "../contract/zod-schema";

export function validateCompiledZod(input: unknown): ValidationResult {
  return validateCurrentZod(input);
}

export function validateDiagnosticCompiledZod(
  input: unknown,
): ValidationResult {
  return validateDiagnosticCurrentZod(input);
}

export const compiledZodAdapter: ValidatorAdapter = {
  name: "compiled-zod",
  inputOwnership: "clone",
  validate: validateCompiledZod,
};
