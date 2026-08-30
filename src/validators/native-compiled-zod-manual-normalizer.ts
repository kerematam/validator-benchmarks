import { z, type ZodType } from "zod";
import type { ValidationEnvelope } from "../contract/limits";
import {
  normalizedIssueFromZod,
  sortNormalizedIssues,
  type ValidationResult,
  type ValidatorAdapter,
} from "../contract/normalized-issue";
import {
  DiagnosticManualNormalizerStructuredReportRequestSchema,
  ManualNormalizerStructuredReportRequestSchema,
} from "../contract/zod-manual-normalizer-schema";
import {
  normalizeRequestInPlace,
  prepareRequestInPlace,
} from "./contract-runtime";

function schemaForEnvelope(envelope: ValidationEnvelope): ZodType {
  return envelope === "production"
    ? ManualNormalizerStructuredReportRequestSchema
    : DiagnosticManualNormalizerStructuredReportRequestSchema;
}

function compileSchema(envelope: ValidationEnvelope): ZodType {
  const schema = schemaForEnvelope(envelope);
  const compiled = z.compile(schema, { strict: true });
  if (compiled === schema) {
    throw new Error("Native Zod compilation returned the uncompiled schema");
  }
  return compiled;
}

function normalizeSuccessfulInput(
  input: unknown,
  dropPrototypeKeys = false,
): ValidationResult {
  const normalized = normalizeRequestInPlace(input, { dropPrototypeKeys });
  if (normalized.issues.length > 0) {
    return {
      success: false,
      issues: sortNormalizedIssues(normalized.issues),
      nativeIssues: normalized.issues,
    };
  }
  return { success: true, data: normalized.data, nativeIssues: [] };
}

export function createNativeCompiledZodSeparateNormalizationAdapter(
  envelope: ValidationEnvelope = "production",
): ValidatorAdapter {
  const schema = compileSchema(envelope);

  return {
    name: "zod-4.5-compiled-separate-normalization",
    inputOwnership: "mutate",
    validate(input) {
      const prepared = prepareRequestInPlace(input);
      const result = schema.safeParse(prepared);
      if (!result.success) {
        return {
          success: false,
          issues: sortNormalizedIssues(
            result.error.issues.map(normalizedIssueFromZod),
          ),
          nativeIssues: result.error.issues,
        };
      }
      return normalizeSuccessfulInput(result.data);
    },
  };
}

export function createNativeCompiledZodValidateSeparateNormalizationAdapter(
  envelope: ValidationEnvelope = "production",
): ValidatorAdapter {
  const schema = compileSchema(envelope);

  return {
    name: "zod-4.5-compiled-validate-separate-normalization",
    inputOwnership: "mutate",
    validate(input) {
      const prepared = prepareRequestInPlace(input);
      if (z.validate(schema, prepared)) {
        return normalizeSuccessfulInput(prepared, true);
      }

      const diagnosticResult = schema.safeParse(prepared);
      if (diagnosticResult.success) {
        throw new Error("Zod validate and safeParse produced different verdicts");
      }
      return {
        success: false,
        issues: sortNormalizedIssues(
          diagnosticResult.error.issues.map(normalizedIssueFromZod),
        ),
        nativeIssues: diagnosticResult.error.issues,
      };
    },
  };
}
