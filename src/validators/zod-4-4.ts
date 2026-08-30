import {
  DiagnosticStructuredReportRequestSchema,
  StructuredReportRequestSchema,
} from "../contract/zod-4-4-schema";
import type {
  ValidationResult,
  ValidatorAdapter,
} from "../contract/normalized-issue";
import { validateWithZodSchema } from "./zod-result";

export function validateZod44NativeTransform(input: unknown): ValidationResult {
  return validateWithZodSchema(StructuredReportRequestSchema, input);
}

export function validateDiagnosticZod44NativeTransform(
  input: unknown,
): ValidationResult {
  return validateWithZodSchema(
    DiagnosticStructuredReportRequestSchema,
    input,
  );
}

export const zod44NativeTransformAdapter: ValidatorAdapter = {
  name: "zod-4.4-native-transform",
  inputOwnership: "clone",
  validate: validateZod44NativeTransform,
};

export const diagnosticZod44NativeTransformAdapter: ValidatorAdapter = {
  name: "zod-4.4-native-transform",
  inputOwnership: "clone",
  validate: validateDiagnosticZod44NativeTransform,
};
