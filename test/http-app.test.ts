import { describe, expect, test } from "bun:test";
import type { ValidatorAdapter } from "../src/contract/normalized-issue";
import { createBenchmarkApp } from "../src/http/create-app";
import { generateSyntheticProfile } from "../src/generator/generate";
import { ajvAdapter } from "../src/validators/ajv";
import { zod45NativeTransformAdapter } from "../src/validators/current-zod";
import { zod45SeparateNormalizationAdapter } from "../src/validators/current-zod-manual-normalizer";
import { createNativeCompiledZodAdapter } from "../src/validators/native-compiled-zod";
import {
  createNativeCompiledZodSeparateNormalizationAdapter,
  createNativeCompiledZodValidateSeparateNormalizationAdapter,
} from "../src/validators/native-compiled-zod-manual-normalizer";
import { typeboxAdapter } from "../src/validators/typebox";
import { typeboxNativeTransformAdapter } from "../src/validators/typebox-native-transform";
import { valibotAdapter } from "../src/validators/valibot";
import { valibotNativeTransformAdapter } from "../src/validators/valibot-native-transform";
import { noValidationAdapter } from "../src/validators/none";
import { zod44NativeTransformAdapter } from "../src/validators/zod-4-4";
import { zod44SeparateNormalizationAdapter } from "../src/validators/zod-4-4-manual-normalizer";

const zod45CompiledNativeTransformAdapter = createNativeCompiledZodAdapter();
const zod45CompiledSeparateNormalizationAdapter =
  createNativeCompiledZodSeparateNormalizationAdapter();
const zod45CompiledValidateSeparateNormalizationAdapter =
  createNativeCompiledZodValidateSeparateNormalizationAdapter();

const realAdapters: ValidatorAdapter[] = [
  zod44NativeTransformAdapter,
  zod44SeparateNormalizationAdapter,
  zod45NativeTransformAdapter,
  zod45SeparateNormalizationAdapter,
  zod45CompiledNativeTransformAdapter,
  zod45CompiledSeparateNormalizationAdapter,
  zod45CompiledValidateSeparateNormalizationAdapter,
  ajvAdapter,
  typeboxAdapter,
  typeboxNativeTransformAdapter,
  valibotAdapter,
  valibotNativeTransformAdapter,
];

describe("Bun and Hono validation route", () => {
  test.each(realAdapters)(
    "accepts a valid request with $name",
    async (adapter) => {
      const app = createBenchmarkApp(adapter);
      const generated = generateSyntheticProfile("smoke", 20_260_807);
      const response = await app.request("/benchmark/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: generated.json,
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        ok: true,
        variant: adapter.name,
        reportCount: 1,
      });
    },
  );

  test.each(realAdapters)(
    "returns normalized issues for $name",
    async (adapter) => {
      const app = createBenchmarkApp(adapter);
      const response = await app.request("/benchmark/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ data: [] }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        ok: false,
        variant: adapter.name,
        issueCount: 1,
        issues: [{ category: "too_small", path: ["data"] }],
      });
    },
  );

  test("returns a stable invalid-JSON response", async () => {
    const app = createBenchmarkApp(zod45NativeTransformAdapter);
    const response = await app.request("/benchmark/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      variant: "zod-4.5-native-transform",
      category: "invalid_json",
    });
  });

  test("labels the no-validation route as a lower-bound variant", async () => {
    const app = createBenchmarkApp(noValidationAdapter);
    const response = await app.request("/benchmark/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: [] }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      variant: "none",
      reportCount: 0,
    });
  });
});
