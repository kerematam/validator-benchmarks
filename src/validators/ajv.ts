import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import {
  DIAGNOSTIC_STRUCTURED_REPORT_JSON_SCHEMA,
  STRUCTURED_REPORT_JSON_SCHEMA,
} from "../contract/ajv-schema";
import {
  sortNormalizedIssues,
  type NormalizedIssue,
  type NormalizedIssueCategory,
  type NormalizedIssuePathSegment,
  type ValidationResult,
  type ValidatorAdapter,
} from "../contract/normalized-issue";
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

function readStringParameter(
  parameters: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = parameters[key];
  return typeof value === "string" ? value : undefined;
}

function normalizedIssueFromAjv(error: ErrorObject): NormalizedIssue {
  const path = decodeJsonPointer(error.instancePath);
  let category: NormalizedIssueCategory = "invalid_type";

  switch (error.keyword) {
    case "required": {
      const missingProperty = readStringParameter(error.params, "missingProperty");
      if (missingProperty !== undefined) {
        path.push(missingProperty);
      }
      break;
    }
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

  return { category, path };
}

function createAjvValidation(schema: object) {
  let validateRequest: ValidateFunction<unknown> | undefined;

  return (input: unknown): ValidationResult => {
    validateRequest ??= new Ajv({
      allErrors: true,
      allowUnionTypes: true,
      strict: true,
    }).compile<unknown>(schema);
    const preparedInput = prepareRequestInPlace(input);
    const valid = validateRequest(preparedInput);
    const ajvErrors = validateRequest.errors ?? [];

    if (!valid) {
      return {
        success: false,
        issues: sortNormalizedIssues(ajvErrors.map(normalizedIssueFromAjv)),
        nativeIssues: ajvErrors,
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
  };
}

const validateProductionAjv = createAjvValidation(
  STRUCTURED_REPORT_JSON_SCHEMA,
);
const validateDiagnosticAjv = createAjvValidation(
  DIAGNOSTIC_STRUCTURED_REPORT_JSON_SCHEMA,
);

export function validateAjv(input: unknown): ValidationResult {
  return validateProductionAjv(input);
}

export const ajvAdapter: ValidatorAdapter = {
  name: "ajv",
  inputOwnership: "mutate",
  validate: validateAjv,
};

export const diagnosticAjvAdapter: ValidatorAdapter = {
  name: "ajv",
  inputOwnership: "mutate",
  validate: validateDiagnosticAjv,
};
