import { Hono } from "hono";
import type { ValidatorAdapter } from "../contract/normalized-issue";

export const BENCHMARK_VALIDATION_PATH = "/benchmark/validate";

export interface BenchmarkAppOptions {
  readonly onParsed?: (value: unknown) => void;
  readonly onValidated?: (value: unknown) => void;
}

function reportCount(value: unknown): number {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return 0;
  }

  for (const [key, child] of Object.entries(value)) {
    if (key === "data" && Array.isArray(child)) {
      return child.length;
    }
  }

  return 0;
}

export function createBenchmarkApp(
  adapter: ValidatorAdapter,
  options: BenchmarkAppOptions = {},
): Hono {
  const app = new Hono();

  app.get("/health", (context) =>
    context.json({ status: "ok", variant: adapter.name }),
  );

  app.post(BENCHMARK_VALIDATION_PATH, async (context) => {
    let body: unknown;
    try {
      body = await context.req.json();
    } catch {
      return context.json(
        {
          ok: false,
          variant: adapter.name,
          category: "invalid_json",
        },
        400,
      );
    }

    options.onParsed?.(body);

    const result = adapter.validate(body);
    if (!result.success) {
      return context.json(
        {
          ok: false,
          variant: adapter.name,
          issueCount: result.issues.length,
          issues: result.issues,
        },
        400,
      );
    }

    options.onValidated?.(result.data);

    return context.json({
      ok: true,
      variant: adapter.name,
      reportCount: reportCount(result.data),
    });
  });

  return app;
}
