import type { ZodError } from "zod";

export type NormalizedIssueCategory =
  | "invalid_type"
  | "non_blank"
  | "too_big"
  | "too_small"
  | "unrecognized_keys";

export type NormalizedIssuePathSegment = string | number;

export interface NormalizedIssue {
  readonly category: NormalizedIssueCategory;
  readonly path: readonly NormalizedIssuePathSegment[];
}

export type ValidationResult =
  | {
      readonly success: true;
      readonly data: unknown;
      readonly nativeIssues: readonly unknown[];
    }
  | {
      readonly success: false;
      readonly issues: readonly NormalizedIssue[];
      readonly nativeIssues: readonly unknown[];
    };

export type InputOwnership = "clone" | "mutate" | "reuse";

export interface ValidatorAdapter {
  readonly name:
    | "current-zod"
    | "compiled-zod"
    | "zod-manual-normalizer"
    | "compiled-zod-manual-normalizer"
    | "ajv"
    | "typebox"
    | "typebox-native-transform"
    | "valibot"
    | "valibot-native-transform"
    | "none";
  readonly inputOwnership: InputOwnership;
  validate(input: unknown): ValidationResult;
}

function normalizePathSegment(
  segment: PropertyKey,
): NormalizedIssuePathSegment {
  return typeof segment === "symbol" ? String(segment) : segment;
}

export function normalizedIssueFromZod(
  issue: ZodError["issues"][number],
): NormalizedIssue {
  let category: NormalizedIssueCategory;
  switch (issue.code) {
    case "too_small":
      category = "too_small";
      break;
    case "too_big":
      category = "too_big";
      break;
    case "unrecognized_keys":
      category = "unrecognized_keys";
      break;
    case "custom":
      category = "non_blank";
      break;
    default:
      category = "invalid_type";
      break;
  }

  return {
    category,
    path: issue.path.map(normalizePathSegment),
  };
}

function comparePathSegments(
  left: NormalizedIssuePathSegment,
  right: NormalizedIssuePathSegment,
): number {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  if (typeof left === "number") {
    return -1;
  }
  if (typeof right === "number") {
    return 1;
  }
  return left.localeCompare(right);
}

export function sortNormalizedIssues(
  issues: readonly NormalizedIssue[],
): readonly NormalizedIssue[] {
  const sorted = [...issues].sort((left, right) => {
    const sharedLength = Math.min(left.path.length, right.path.length);
    for (let index = 0; index < sharedLength; index += 1) {
      const leftSegment = left.path[index];
      const rightSegment = right.path[index];
      if (leftSegment === undefined || rightSegment === undefined) {
        continue;
      }
      const comparison = comparePathSegments(leftSegment, rightSegment);
      if (comparison !== 0) {
        return comparison;
      }
    }

    return (
      left.path.length - right.path.length ||
      left.category.localeCompare(right.category)
    );
  });

  return sorted.filter((issue, index) => {
    const previous = sorted[index - 1];
    return (
      previous === undefined ||
      issue.category !== previous.category ||
      issue.path.length !== previous.path.length ||
      issue.path.some((segment, pathIndex) => segment !== previous.path[pathIndex])
    );
  });
}
