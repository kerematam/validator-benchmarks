import type { TLocalizedValidationError } from "typebox/error";
import Schema from "typebox/schema";
import {
  sortNormalizedIssues,
  type NormalizedIssue,
  type NormalizedIssueCategory,
  type NormalizedIssuePathSegment,
  type ValidationResult,
  type ValidatorAdapter,
} from "../contract/normalized-issue";
import {
  DIAGNOSTIC_STRUCTURED_REPORT_TYPEBOX_SCHEMA,
  STRUCTURED_REPORT_TYPEBOX_SCHEMA,
} from "../contract/typebox-schema";
import {
  normalizeRequestInPlace,
  prepareRequestInPlace,
} from "./contract-runtime";

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
      category = "too_small";
      break;
    case "maxItems":
      category = "too_big";
      break;
  }

  return [{ category, path }];
}

function createTypeBoxValidation(
  schema: typeof STRUCTURED_REPORT_TYPEBOX_SCHEMA,
) {
  let typeboxValidator: ReturnType<typeof Schema.Compile> | undefined;

  return {
    validate(input: unknown): ValidationResult {
      typeboxValidator ??= Schema.Compile(schema);
      const preparedInput = prepareRequestInPlace(input);
      const valid = typeboxValidator.Check(preparedInput);
      const typeboxErrors = valid
        ? []
        : typeboxValidator.Errors(preparedInput)[1];
      const structuralIssues = typeboxErrors.flatMap(normalizedIssuesFromTypeBox);

      if (!valid) {
        return {
          success: false,
          issues: sortNormalizedIssues(structuralIssues),
          nativeIssues: typeboxErrors,
        };
      }

      const normalized = normalizeRequestInPlace(preparedInput);
      if (normalized.issues.length > 0) {
        return {
          success: false,
          issues: sortNormalizedIssues(normalized.issues),
          nativeIssues: normalized.issues,
        };
      }

      return {
        success: true,
        data: normalized.data,
        nativeIssues: [],
      };
    },
    isAccelerated(): boolean {
      typeboxValidator ??= Schema.Compile(schema);
      return typeboxValidator.IsAccelerated();
    },
  };
}

const productionTypeBox = createTypeBoxValidation(
  STRUCTURED_REPORT_TYPEBOX_SCHEMA,
);
const diagnosticTypeBox = createTypeBoxValidation(
  DIAGNOSTIC_STRUCTURED_REPORT_TYPEBOX_SCHEMA,
);

export function validateTypeBox(input: unknown): ValidationResult {
  return productionTypeBox.validate(input);
}

export function validateDiagnosticTypeBox(input: unknown): ValidationResult {
  return diagnosticTypeBox.validate(input);
}

export function isTypeBoxAccelerated(): boolean {
  return productionTypeBox.isAccelerated();
}

export function isDiagnosticTypeBoxAccelerated(): boolean {
  return diagnosticTypeBox.isAccelerated();
}

export const typeboxAdapter: ValidatorAdapter = {
  name: "typebox",
  inputOwnership: "mutate",
  validate: validateTypeBox,
};

export const diagnosticTypeboxAdapter: ValidatorAdapter = {
  name: "typebox",
  inputOwnership: "mutate",
  validate: validateDiagnosticTypeBox,
};
