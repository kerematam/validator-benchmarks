import * as v from "valibot";
import {
  DIAGNOSTIC_VALIBOT_NATIVE_TRANSFORM_SCHEMA,
  VALIBOT_NATIVE_TRANSFORM_SCHEMA,
} from "../contract/valibot-native-transform-schema";
import {
  sortNormalizedIssues,
  type NormalizedIssue,
  type NormalizedIssueCategory,
  type NormalizedIssuePathSegment,
  type ValidationResult,
  type ValidatorAdapter,
} from "../contract/normalized-issue";
import { prepareRequestInPlace } from "./contract-runtime";

function normalizedPathFromValibot(
  issue: v.GenericIssue,
): NormalizedIssuePathSegment[] {
  return (issue.path ?? []).map(({ key }) => {
    if (typeof key === "string" || typeof key === "number") {
      return key;
    }
    return String(key);
  });
}

function normalizedIssueFromValibot(issue: v.GenericIssue): NormalizedIssue {
  const path = normalizedPathFromValibot(issue);
  let category: NormalizedIssueCategory = "invalid_type";

  switch (issue.type) {
    case "strict_object":
      if (issue.expected === "never") {
        category = "unrecognized_keys";
        path.pop();
      }
      break;
    case "min_length":
      category = "too_small";
      break;
    case "max_length":
      category = "too_big";
      break;
  }

  return { category, path };
}

function createValibotNativeTransformValidation(
  schema: typeof VALIBOT_NATIVE_TRANSFORM_SCHEMA,
) {
  const parse = v.safeParser(schema, {
    abortEarly: false,
    abortPipeEarly: false,
  });

  return (input: unknown): ValidationResult => {
    const preparedInput = prepareRequestInPlace(input);
    const parsed = parse(preparedInput);
    const nativeIssues = parsed.issues ?? [];
    if (!parsed.success) {
      return {
        success: false,
        issues: sortNormalizedIssues(
          nativeIssues.map(normalizedIssueFromValibot),
        ),
        nativeIssues,
      };
    }
    return { success: true, data: parsed.output, nativeIssues: [] };
  };
}

const validateProductionValibotNativeTransform =
  createValibotNativeTransformValidation(VALIBOT_NATIVE_TRANSFORM_SCHEMA);
const validateDiagnosticValibotNativeTransform =
  createValibotNativeTransformValidation(
    DIAGNOSTIC_VALIBOT_NATIVE_TRANSFORM_SCHEMA,
  );

export function validateValibotNativeTransform(
  input: unknown,
): ValidationResult {
  return validateProductionValibotNativeTransform(input);
}

export const valibotNativeTransformAdapter: ValidatorAdapter = {
  name: "valibot-native-transform",
  inputOwnership: "mutate",
  validate: validateValibotNativeTransform,
};

export const diagnosticValibotNativeTransformAdapter: ValidatorAdapter = {
  name: "valibot-native-transform",
  inputOwnership: "mutate",
  validate: validateDiagnosticValibotNativeTransform,
};
