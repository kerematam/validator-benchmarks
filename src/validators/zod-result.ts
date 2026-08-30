import {
  normalizedIssueFromZod,
  sortNormalizedIssues,
  type ValidationResult,
  type ZodIssueLike,
} from "../contract/normalized-issue";

export interface ZodSchemaLike {
  safeParse(input: unknown):
    | { readonly success: true; readonly data: unknown }
    | {
        readonly success: false;
        readonly error: { readonly issues: readonly ZodIssueLike[] };
      };
}

export function validateWithZodSchema(
  schema: ZodSchemaLike,
  input: unknown,
): ValidationResult {
  const result = schema.safeParse(input);
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
