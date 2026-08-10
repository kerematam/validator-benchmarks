import { resolve } from "node:path";
import { z } from "zod";
import type { ValidationEnvelope } from "../contract/limits";
import type { ValidatorAdapter } from "../contract/normalized-issue";

export const ValidatorNameSchema = z.enum([
  "current-zod",
  "compiled-zod",
  "zod-manual-normalizer",
  "compiled-zod-manual-normalizer",
  "ajv",
  "typebox",
  "typebox-native-transform",
  "valibot",
  "valibot-native-transform",
  "none",
]);
export type ValidatorName = z.infer<typeof ValidatorNameSchema>;

export async function loadValidatorAdapter(
  name: ValidatorName,
  envelope: ValidationEnvelope = "production",
): Promise<ValidatorAdapter> {
  switch (name) {
    case "current-zod": {
      const { currentZodAdapter } = await import("./current-zod");
      if (envelope === "production") {
        return currentZodAdapter;
      }
      const { diagnosticCurrentZodAdapter } = await import("./current-zod");
      return diagnosticCurrentZodAdapter;
    }
    case "compiled-zod": {
      const { loadCompiledZodAdapter } = await import("./load-compiled-zod");
      return loadCompiledZodAdapter(
        resolve("dist/compiled-zod-external/compiled-zod-entry.js"),
        envelope,
      );
    }
    case "zod-manual-normalizer": {
      const {
        currentZodManualNormalizerAdapter,
        diagnosticCurrentZodManualNormalizerAdapter,
      } = await import("./current-zod-manual-normalizer");
      return envelope === "production"
        ? currentZodManualNormalizerAdapter
        : diagnosticCurrentZodManualNormalizerAdapter;
    }
    case "compiled-zod-manual-normalizer": {
      const { loadCompiledZodManualNormalizerAdapter } = await import(
        "./load-compiled-zod-manual-normalizer"
      );
      return loadCompiledZodManualNormalizerAdapter(
        resolve(
          "dist/compiled-zod-manual-normalizer/compiled-zod-manual-normalizer-entry.js",
        ),
        envelope,
      );
    }
    case "ajv": {
      const { ajvAdapter } = await import("./ajv");
      if (envelope === "production") {
        return ajvAdapter;
      }
      const { diagnosticAjvAdapter } = await import("./ajv");
      return diagnosticAjvAdapter;
    }
    case "typebox": {
      const { typeboxAdapter } = await import("./typebox");
      if (envelope === "production") {
        return typeboxAdapter;
      }
      const { diagnosticTypeboxAdapter } = await import("./typebox");
      return diagnosticTypeboxAdapter;
    }
    case "typebox-native-transform": {
      const {
        typeboxNativeTransformAdapter,
        diagnosticTypeboxNativeTransformAdapter,
      } = await import("./typebox-native-transform");
      return envelope === "production"
        ? typeboxNativeTransformAdapter
        : diagnosticTypeboxNativeTransformAdapter;
    }
    case "valibot": {
      const { valibotAdapter } = await import("./valibot");
      if (envelope === "production") {
        return valibotAdapter;
      }
      const { diagnosticValibotAdapter } = await import("./valibot");
      return diagnosticValibotAdapter;
    }
    case "valibot-native-transform": {
      const {
        valibotNativeTransformAdapter,
        diagnosticValibotNativeTransformAdapter,
      } = await import("./valibot-native-transform");
      return envelope === "production"
        ? valibotNativeTransformAdapter
        : diagnosticValibotNativeTransformAdapter;
    }
    case "none": {
      const { noValidationAdapter } = await import("./none");
      return noValidationAdapter;
    }
  }
}
