import { describe, expect, test } from "bun:test";
import { createBenchmarkApp } from "../src/http/create-app";
import { generateSyntheticProfile } from "../src/generator/generate";
import { ajvAdapter } from "../src/validators/ajv";
import { currentZodAdapter } from "../src/validators/current-zod";
import { currentZodManualNormalizerAdapter } from "../src/validators/current-zod-manual-normalizer";
import { typeboxAdapter } from "../src/validators/typebox";
import { typeboxNativeTransformAdapter } from "../src/validators/typebox-native-transform";
import { valibotAdapter } from "../src/validators/valibot";
import { valibotNativeTransformAdapter } from "../src/validators/valibot-native-transform";
import { noValidationAdapter } from "../src/validators/none";

describe("Bun and Hono validation route", () => {
  test.each([
    currentZodAdapter,
    currentZodManualNormalizerAdapter,
    ajvAdapter,
    typeboxAdapter,
    typeboxNativeTransformAdapter,
    valibotAdapter,
    valibotNativeTransformAdapter,
  ])(
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

  test.each([
    currentZodAdapter,
    currentZodManualNormalizerAdapter,
    ajvAdapter,
    typeboxAdapter,
    typeboxNativeTransformAdapter,
    valibotAdapter,
    valibotNativeTransformAdapter,
  ])(
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
    const app = createBenchmarkApp(currentZodAdapter);
    const response = await app.request("/benchmark/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      variant: "current-zod",
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
