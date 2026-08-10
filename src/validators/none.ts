import type {
  ValidationResult,
  ValidatorAdapter,
} from "../contract/normalized-issue";

export function validateNone(input: unknown): ValidationResult {
  return {
    success: true,
    data: input,
    nativeIssues: [],
  };
}

export const noValidationAdapter: ValidatorAdapter = {
  name: "none",
  inputOwnership: "reuse",
  validate: validateNone,
};
