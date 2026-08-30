import { z } from "zod";
import type { ValidationEnvelope } from "../contract/limits";
import type { ValidatorAdapter } from "../contract/normalized-issue";

export const ValidatorNameSchema = z.enum([
  "zod-4.4-native-transform",
  "zod-4.4-separate-normalization",
  "zod-4.5-native-transform",
  "zod-4.5-separate-normalization",
  "zod-4.5-compiled-native-transform",
  "zod-4.5-compiled-separate-normalization",
  "zod-4.5-compiled-validate-separate-normalization",
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
    case "zod-4.4-native-transform": {
      const { zod44NativeTransformAdapter } = await import("./zod-4-4");
      if (envelope === "production") {
        return zod44NativeTransformAdapter;
      }
      const { diagnosticZod44NativeTransformAdapter } = await import(
        "./zod-4-4"
      );
      return diagnosticZod44NativeTransformAdapter;
    }
    case "zod-4.4-separate-normalization": {
      const {
        zod44SeparateNormalizationAdapter,
        diagnosticZod44SeparateNormalizationAdapter,
      } = await import("./zod-4-4-manual-normalizer");
      return envelope === "production"
        ? zod44SeparateNormalizationAdapter
        : diagnosticZod44SeparateNormalizationAdapter;
    }
    case "zod-4.5-native-transform": {
      const { zod45NativeTransformAdapter } = await import("./current-zod");
      if (envelope === "production") {
        return zod45NativeTransformAdapter;
      }
      const { diagnosticZod45NativeTransformAdapter } = await import(
        "./current-zod"
      );
      return diagnosticZod45NativeTransformAdapter;
    }
    case "zod-4.5-separate-normalization": {
      const {
        zod45SeparateNormalizationAdapter,
        diagnosticZod45SeparateNormalizationAdapter,
      } = await import("./current-zod-manual-normalizer");
      return envelope === "production"
        ? zod45SeparateNormalizationAdapter
        : diagnosticZod45SeparateNormalizationAdapter;
    }
    case "zod-4.5-compiled-native-transform": {
      const { createNativeCompiledZodAdapter } = await import(
        "./native-compiled-zod"
      );
      return createNativeCompiledZodAdapter(envelope);
    }
    case "zod-4.5-compiled-separate-normalization": {
      const {
        createNativeCompiledZodSeparateNormalizationAdapter,
      } = await import("./native-compiled-zod-manual-normalizer");
      return createNativeCompiledZodSeparateNormalizationAdapter(envelope);
    }
    case "zod-4.5-compiled-validate-separate-normalization": {
      const {
        createNativeCompiledZodValidateSeparateNormalizationAdapter,
      } = await import("./native-compiled-zod-manual-normalizer");
      return createNativeCompiledZodValidateSeparateNormalizationAdapter(
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
