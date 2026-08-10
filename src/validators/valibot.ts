import * as v from "valibot";
import {
  sortNormalizedIssues,
  type NormalizedIssue,
  type NormalizedIssueCategory,
  type NormalizedIssuePathSegment,
  type ValidationResult,
  type ValidatorAdapter,
} from "../contract/normalized-issue";
import {
  DIAGNOSTIC_STRUCTURED_REPORT_VALIBOT_SCHEMA,
  STRUCTURED_REPORT_VALIBOT_SCHEMA,
} from "../contract/valibot-schema";
import {
  normalizeRequestInPlace,
  prepareRequestInPlace,
} from "./contract-runtime";

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

function createValibotValidation(
  schema: typeof STRUCTURED_REPORT_VALIBOT_SCHEMA,
) {
  const parseValibotRequest = v.safeParser(schema, {
    abortEarly: false,
    abortPipeEarly: false,
  });

  return (input: unknown): ValidationResult => {
    const preparedInput = prepareRequestInPlace(input);
    const parsed = parseValibotRequest(preparedInput);
    const valibotIssues = parsed.issues ?? [];

    if (!parsed.success) {
      return {
        success: false,
        issues: sortNormalizedIssues(
          valibotIssues.map(normalizedIssueFromValibot),
        ),
        nativeIssues: valibotIssues,
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

const validateProductionValibot = createValibotValidation(
  STRUCTURED_REPORT_VALIBOT_SCHEMA,
);
const validateDiagnosticValibot = createValibotValidation(
  DIAGNOSTIC_STRUCTURED_REPORT_VALIBOT_SCHEMA,
);

export function validateValibot(input: unknown): ValidationResult {
  return validateProductionValibot(input);
}

export const valibotAdapter: ValidatorAdapter = {
  name: "valibot",
  inputOwnership: "mutate",
  validate: validateValibot,
};

export const diagnosticValibotAdapter: ValidatorAdapter = {
  name: "valibot",
  inputOwnership: "mutate",
  validate: validateDiagnosticValibot,
};
