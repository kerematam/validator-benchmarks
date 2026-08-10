import type { TLocalizedValidationError } from "typebox/error";
import Schema from "typebox/schema";
import { Decode } from "typebox/value";
import {
  DIAGNOSTIC_TYPEBOX_NATIVE_TRANSFORM_INPUT_SCHEMA,
  DIAGNOSTIC_TYPEBOX_NORMALIZED_OUTPUT_SCHEMA,
  TYPEBOX_NATIVE_TRANSFORM_INPUT_SCHEMA,
  TYPEBOX_NORMALIZED_OUTPUT_SCHEMA,
} from "../contract/typebox-native-transform-schema";
import {
  sortNormalizedIssues,
  type NormalizedIssue,
  type NormalizedIssueCategory,
  type NormalizedIssuePathSegment,
  type ValidationResult,
  type ValidatorAdapter,
} from "../contract/normalized-issue";
import { prepareRequestInPlace } from "./contract-runtime";

function decodeJsonPointer(pointer: string): NormalizedIssuePathSegment[] {
  if (pointer === "") {
    return [];
  }
  return pointer
    .split("/")
    .slice(1)
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .map((part) => (/^(?:0|[1-9][0-9]*)$/u.test(part) ? Number(part) : part));
}

function normalizedIssuesFromTypeBox(
  error: TLocalizedValidationError,
): readonly NormalizedIssue[] {
  const path = decodeJsonPointer(error.instancePath);
  let category: NormalizedIssueCategory = "invalid_type";

  switch (error.keyword) {
    case "required":
      return error.params.requiredProperties.map((property) => ({
        category,
        path: [...path, property],
      }));
    case "additionalProperties":
      category = "unrecognized_keys";
      break;
    case "minItems":
    case "minLength":
      category = "too_small";
      break;
    case "maxItems":
      category = "too_big";
      break;
  }

  return [{ category, path }];
}

function createTypeBoxNativeTransformValidation(
  inputSchema: typeof TYPEBOX_NATIVE_TRANSFORM_INPUT_SCHEMA,
  outputSchema: typeof TYPEBOX_NORMALIZED_OUTPUT_SCHEMA,
) {
  let inputValidator: ReturnType<typeof Schema.Compile> | undefined;
  let outputValidator: ReturnType<typeof Schema.Compile> | undefined;

  return {
    validate(input: unknown): ValidationResult {
      inputValidator ??= Schema.Compile(inputSchema);
      outputValidator ??= Schema.Compile(outputSchema);
      const preparedInput = prepareRequestInPlace(input);
      if (!inputValidator.Check(preparedInput)) {
        const errors = inputValidator.Errors(preparedInput)[1];
        return {
          success: false,
          issues: sortNormalizedIssues(
            errors.flatMap(normalizedIssuesFromTypeBox),
          ),
          nativeIssues: errors,
        };
      }

      const decoded: unknown = Decode(inputSchema, preparedInput);
      if (!outputValidator.Check(decoded)) {
        const errors = outputValidator.Errors(decoded)[1];
        return {
          success: false,
          issues: sortNormalizedIssues(
            errors.flatMap(normalizedIssuesFromTypeBox),
          ),
          nativeIssues: errors,
        };
      }

      return { success: true, data: decoded, nativeIssues: [] };
    },
    isAccelerated(): boolean {
      inputValidator ??= Schema.Compile(inputSchema);
      outputValidator ??= Schema.Compile(outputSchema);
      return inputValidator.IsAccelerated() && outputValidator.IsAccelerated();
    },
  };
}

const productionTypeBoxNativeTransform =
  createTypeBoxNativeTransformValidation(
    TYPEBOX_NATIVE_TRANSFORM_INPUT_SCHEMA,
    TYPEBOX_NORMALIZED_OUTPUT_SCHEMA,
  );
const diagnosticTypeBoxNativeTransform =
  createTypeBoxNativeTransformValidation(
    DIAGNOSTIC_TYPEBOX_NATIVE_TRANSFORM_INPUT_SCHEMA,
    DIAGNOSTIC_TYPEBOX_NORMALIZED_OUTPUT_SCHEMA,
  );

export function validateTypeBoxNativeTransform(
  input: unknown,
): ValidationResult {
  return productionTypeBoxNativeTransform.validate(input);
}

export function validateDiagnosticTypeBoxNativeTransform(
  input: unknown,
): ValidationResult {
  return diagnosticTypeBoxNativeTransform.validate(input);
}

export function isTypeBoxNativeTransformAccelerated(): boolean {
  return productionTypeBoxNativeTransform.isAccelerated();
}

export function isDiagnosticTypeBoxNativeTransformAccelerated(): boolean {
  return diagnosticTypeBoxNativeTransform.isAccelerated();
}

export const typeboxNativeTransformAdapter: ValidatorAdapter = {
  name: "typebox-native-transform",
  inputOwnership: "mutate",
  validate: validateTypeBoxNativeTransform,
};

export const diagnosticTypeboxNativeTransformAdapter: ValidatorAdapter = {
  name: "typebox-native-transform",
  inputOwnership: "mutate",
  validate: validateDiagnosticTypeBoxNativeTransform,
};
