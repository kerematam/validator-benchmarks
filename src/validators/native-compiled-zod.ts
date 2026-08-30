import { z } from "zod";
import type { ValidationEnvelope } from "../contract/limits";
import type { ValidatorAdapter } from "../contract/normalized-issue";
import { structuredReportRequestSchemaForEnvelope } from "../contract/zod-schema";
import { validateWithZodSchema } from "./zod-result";

function compileFinalSchema<T extends z.ZodType>(schema: T): T {
  const compiled = z.compile(schema, { strict: true });
  if (compiled === schema) {
    throw new Error("Native Zod compilation returned the uncompiled schema");
  }
  return compiled;
}

export function createNativeCompiledZodAdapter(
  envelope: ValidationEnvelope = "production",
): ValidatorAdapter {
  const schema = compileFinalSchema(
    structuredReportRequestSchemaForEnvelope(envelope),
  );

  return {
    name: "zod-4.5-compiled-native-transform",
    inputOwnership: "clone",
    validate(input) {
      return validateWithZodSchema(schema, input);
    },
  };
}
