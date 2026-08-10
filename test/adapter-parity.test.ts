import { beforeAll, describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ValidatorAdapter } from "../src/contract/normalized-issue";
import {
  DIAGNOSTIC_MAX_REPORTS,
  PRODUCTION_MAX_REPORTS,
} from "../src/contract/limits";
import { generateSyntheticProfile } from "../src/generator/generate";
import {
  ajvAdapter,
  diagnosticAjvAdapter,
} from "../src/validators/ajv";
import {
  currentZodAdapter,
  diagnosticCurrentZodAdapter,
} from "../src/validators/current-zod";
import { loadCompiledZodAdapter } from "../src/validators/load-compiled-zod";
import {
  currentZodManualNormalizerAdapter,
  diagnosticCurrentZodManualNormalizerAdapter,
} from "../src/validators/current-zod-manual-normalizer";
import { loadCompiledZodManualNormalizerAdapter } from "../src/validators/load-compiled-zod-manual-normalizer";
import { noValidationAdapter } from "../src/validators/none";
import {
  isTypeBoxAccelerated,
  isDiagnosticTypeBoxAccelerated,
  diagnosticTypeboxAdapter,
  typeboxAdapter,
} from "../src/validators/typebox";
import {
  diagnosticTypeboxNativeTransformAdapter,
  isDiagnosticTypeBoxNativeTransformAccelerated,
  isTypeBoxNativeTransformAccelerated,
  typeboxNativeTransformAdapter,
} from "../src/validators/typebox-native-transform";
import {
  diagnosticValibotAdapter,
  valibotAdapter,
} from "../src/validators/valibot";
import {
  diagnosticValibotNativeTransformAdapter,
  valibotNativeTransformAdapter,
} from "../src/validators/valibot-native-transform";

let compiledZodAdapter: ValidatorAdapter;
let diagnosticCompiledZodAdapter: ValidatorAdapter;
let compiledZodManualNormalizerAdapter: ValidatorAdapter;
let diagnosticCompiledZodManualNormalizerAdapter: ValidatorAdapter;
let fullyBundledRuntimeCompatible: boolean | undefined;

beforeAll(async () => {
  const build = Bun.spawn([Bun.argv[0] ?? "bun", "run", "build:compiled"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    build.exited,
    new Response(build.stdout).text(),
    new Response(build.stderr).text(),
  ]);
  if (exitCode !== 0) {
    throw new Error(
      `Compiled build gate failed: ${stderr.trim() || stdout.trim()}`,
    );
  }
  compiledZodAdapter = await loadCompiledZodAdapter(
    resolve("dist/compiled-zod-external/compiled-zod-entry.js"),
  );
  diagnosticCompiledZodAdapter = await loadCompiledZodAdapter(
    resolve("dist/compiled-zod-external/compiled-zod-entry.js"),
    "diagnostic",
  );

  const manualNormalizerBuild = Bun.spawn(
    [Bun.argv[0] ?? "bun", "run", "build:compiled:manual-normalizer"],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [manualExitCode, manualStdout, manualStderr] = await Promise.all([
    manualNormalizerBuild.exited,
    new Response(manualNormalizerBuild.stdout).text(),
    new Response(manualNormalizerBuild.stderr).text(),
  ]);
  if (manualExitCode !== 0) {
    throw new Error(
      `Compiled manual-normalizer build gate failed: ${manualStderr.trim() || manualStdout.trim()}`,
    );
  }
  const manualArtifact = resolve(
    "dist/compiled-zod-manual-normalizer/compiled-zod-manual-normalizer-entry.js",
  );
  compiledZodManualNormalizerAdapter =
    await loadCompiledZodManualNormalizerAdapter(manualArtifact);
  diagnosticCompiledZodManualNormalizerAdapter =
    await loadCompiledZodManualNormalizerAdapter(manualArtifact, "diagnostic");

  const bundledBuild = Bun.spawn(
    [Bun.argv[0] ?? "bun", "run", "build:compiled:bundled"],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [bundledExitCode, bundledStdout, bundledStderr] = await Promise.all([
    bundledBuild.exited,
    new Response(bundledBuild.stdout).text(),
    new Response(bundledBuild.stderr).text(),
  ]);
  if (bundledExitCode !== 0) {
    throw new Error(
      `Bundled compatibility build failed: ${bundledStderr.trim() || bundledStdout.trim()}`,
    );
  }
  const compatibilityInput: unknown = JSON.parse(
    await readFile(
      resolve("dist/compiled-zod-bundled/compatibility.json"),
      "utf8",
    ),
  );
  if (
    typeof compatibilityInput !== "object" ||
    compatibilityInput === null ||
    Array.isArray(compatibilityInput)
  ) {
    throw new Error("Bundled compatibility report is invalid");
  }
  const compatibilityEntry = Object.entries(compatibilityInput).find(
    ([key]) => key === "runtimeCompatible",
  );
  if (typeof compatibilityEntry?.[1] !== "boolean") {
    throw new Error("Bundled compatibility verdict is missing");
  }
  fullyBundledRuntimeCompatible = compatibilityEntry[1];
});

function fresh(value: unknown): unknown {
  return structuredClone(value);
}

function minimalReport(): Record<string, unknown> {
  return {
    header: {},
    businessObject: { name: "Synthetic Object" },
    table: {
      columns: [{ key: "synthetic_column_01" }],
      rows: [
        {
          synthetic_row_001: [
            { label: "Synthetic Cell", value: "SYNTHETIC-VALUE" },
          ],
        },
      ],
    },
  };
}

function realAdapters(): readonly ValidatorAdapter[] {
  return [
    currentZodAdapter,
    compiledZodAdapter,
    currentZodManualNormalizerAdapter,
    compiledZodManualNormalizerAdapter,
    ajvAdapter,
    typeboxAdapter,
    typeboxNativeTransformAdapter,
    valibotAdapter,
    valibotNativeTransformAdapter,
  ];
}

function diagnosticAdapters(): readonly ValidatorAdapter[] {
  return [
    diagnosticCurrentZodAdapter,
    diagnosticCompiledZodAdapter,
    diagnosticCurrentZodManualNormalizerAdapter,
    diagnosticCompiledZodManualNormalizerAdapter,
    diagnosticAjvAdapter,
    diagnosticTypeboxAdapter,
    diagnosticTypeboxNativeTransformAdapter,
    diagnosticValibotAdapter,
    diagnosticValibotNativeTransformAdapter,
  ];
}

describe("valid adapter parity", () => {
  test.each(["smoke", "small"])(
    "normalizes the complete %s profile identically",
    (profileName) => {
      if (profileName !== "smoke" && profileName !== "small") {
        throw new Error("Unexpected profile name supplied by the test table");
      }
      const generated = generateSyntheticProfile(profileName, 20_260_807);
      const oracle = currentZodAdapter.validate(fresh(generated.request));
      if (!oracle.success) {
        throw new Error("Current Zod rejected a valid generated profile");
      }

      for (const adapter of realAdapters()) {
        const result = adapter.validate(fresh(generated.request));
        expect(result.success, adapter.name).toBeTrue();
        if (result.success) {
          expect(result.data, adapter.name).toEqual(oracle.data);
        }
      }
    },
  );

  test("normalizes a hand-written mixed-alias request identically", () => {
    const input: unknown = {
      data: [
        {
          templateName: " synthetic-template ",
          header: {
            title: " Synthetic Lower Title ",
            Title: " Synthetic Pascal Title ",
            subtitle: "",
            ReportSubtitle: " Synthetic Subtitle ",
            label: '["Synthetic Label",12,true,null]',
            Value: ["Synthetic Value", false, null],
            academic_year: " Synthetic Period ",
            syntheticHeaderNote: "SYNTHETIC-HEADER-NOTE",
          },
          Header: { Title: " Synthetic Unselected Header " },
          businessObject: {
            Name: " Synthetic Pascal Object ",
            name: " Synthetic Lower Object ",
            Code: 42,
            code: "SYNTHETIC-LOWER-CODE",
            id: false,
          },
          table: {
            columns: [
              {
                key: " synthetic_column_01 ",
                Key: " synthetic_column_alias_01 ",
              },
            ],
            rows: [
              {
                synthetic_row_001: [
                  {
                    label: " Synthetic Lower Cell ",
                    Label: " Synthetic Pascal Cell ",
                    value: 0,
                    Value: 99,
                  },
                ],
              },
            ],
          },
          syntheticReportNote: "SYNTHETIC-REPORT-NOTE",
        },
      ],
    };
    const oracle = currentZodAdapter.validate(fresh(input));
    if (!oracle.success) {
      throw new Error("Current Zod rejected the valid hand-written case");
    }

    for (const adapter of realAdapters()) {
      const result = adapter.validate(fresh(input));
      expect(result.success, adapter.name).toBeTrue();
      if (result.success) {
        expect(result.data, adapter.name).toEqual(oracle.data);
      }
    }
  });

  test("matches nullish container fallback and ignores unselected aliases", () => {
    const fallbackTable = {
      columns: [{ Key: " synthetic_column_01 " }],
      rows: [
        {
          synthetic_row_001: [
            { Label: " Synthetic Cell ", Value: true },
          ],
        },
      ],
    };
    const cases: readonly unknown[] = [
      {
        data: [
          {
            ...minimalReport(),
            header: null,
          },
        ],
      },
      {
        data: [
          {
            ...minimalReport(),
            Header: null,
            syntheticReportNote: "SYNTHETIC-IGNORED-REPORT-NOTE",
          },
        ],
      },
      {
        data: [
          {
            ...minimalReport(),
            BusinessObject: 7,
          },
        ],
      },
      {
        data: [
          {
            ...minimalReport(),
            Table: null,
          },
        ],
      },
      {
        data: [
          {
            header: null,
            Header: {
              Title: " Synthetic Alias Title ",
              syntheticHeaderNote: "SYNTHETIC-IGNORED-HEADER-NOTE",
            },
            businessObject: null,
            BusinessObject: {
              Name: " Synthetic Alias Object ",
              Code: " SYNTHETIC-CODE ",
              syntheticObjectNote: "SYNTHETIC-IGNORED-OBJECT-NOTE",
            },
            table: null,
            Table: fallbackTable,
          },
        ],
      },
    ];

    for (const input of cases) {
      const oracle = currentZodAdapter.validate(fresh(input));
      if (!oracle.success) {
        throw new Error("Current Zod rejected a valid alias regression case");
      }

      for (const adapter of realAdapters()) {
        const result = adapter.validate(fresh(input));
        expect(result.success, adapter.name).toBeTrue();
        if (result.success) {
          expect(result.data, adapter.name).toEqual(oracle.data);
        }
      }
    }
  });

  test("documents acceptance of the __proto__ dynamic row key", () => {
    const input: unknown = JSON.parse(`{
      "data": [{
        "header": {},
        "businessObject": { "name": "Synthetic Object" },
        "table": {
          "columns": [{ "key": "synthetic_column_01" }],
          "rows": [{
            "__proto__": [{
              "label": "Synthetic Cell",
              "value": "SYNTHETIC-VALUE"
            }]
          }]
        }
      }]
    }`);

    for (const adapter of realAdapters()) {
      expect(adapter.validate(fresh(input)).success, adapter.name).toBeTrue();
    }
  });

  test(
    "normalizes the complete diagnostic-10000 profile identically",
    () => {
      const generated = generateSyntheticProfile(
        "diagnostic-10000",
        20_260_807,
      );
      const oracle = diagnosticCurrentZodAdapter.validate(
        fresh(generated.request),
      );
      if (!oracle.success) {
        throw new Error("Diagnostic current Zod rejected the generated profile");
      }

      for (const adapter of diagnosticAdapters()) {
        const result = adapter.validate(fresh(generated.request));
        expect(result.success, adapter.name).toBeTrue();
        if (result.success) {
          expect(result.data, adapter.name).toEqual(oracle.data);
        }
      }
    },
    120_000,
  );

  test("keeps the production and diagnostic maximums distinct", () => {
    const diagnosticInput = {
      data: Array.from({ length: PRODUCTION_MAX_REPORTS + 1 }, minimalReport),
    };
    for (const adapter of realAdapters()) {
      const result = adapter.validate(fresh(diagnosticInput));
      expect(result.success, adapter.name).toBeFalse();
    }
    for (const adapter of diagnosticAdapters()) {
      const result = adapter.validate(fresh(diagnosticInput));
      expect(result.success, adapter.name).toBeTrue();
    }

    const oversizedDiagnosticInput = {
      data: Array.from({ length: DIAGNOSTIC_MAX_REPORTS + 1 }, minimalReport),
    };
    for (const adapter of diagnosticAdapters()) {
      const result = adapter.validate(fresh(oversizedDiagnosticInput));
      expect(result.success, adapter.name).toBeFalse();
      if (!result.success) {
        expect(result.issues, adapter.name).toEqual([
          { category: "too_big", path: ["data"] },
        ]);
      }
    }
  });
});

describe("invalid adapter parity", () => {
  const cases: readonly { readonly name: string; readonly input: unknown }[] = [
    { name: "missing envelope", input: undefined },
    { name: "non-object envelope", input: [] },
    { name: "missing data", input: {} },
    { name: "empty data", input: { data: [] } },
    { name: "non-array data", input: { data: {} } },
    {
      name: "extra top-level key",
      input: { data: [minimalReport()], extra: true },
    },
    {
      name: "multiple extra top-level keys",
      input: {
        data: [minimalReport()],
        syntheticExtraOne: true,
        syntheticExtraTwo: false,
      },
    },
    {
      name: "production oversized",
      input: {
        data: Array.from(
          { length: PRODUCTION_MAX_REPORTS + 1 },
          minimalReport,
        ),
      },
    },
    {
      name: "missing business object",
      input: {
        data: [{ header: {}, table: { columns: [{ key: "x" }], rows: [] } }],
      },
    },
    {
      name: "array report",
      input: { data: [[]] },
    },
    {
      name: "array header",
      input: {
        data: [{ ...minimalReport(), header: [] }],
      },
    },
    {
      name: "array business object",
      input: {
        data: [{ ...minimalReport(), businessObject: [] }],
      },
    },
    {
      name: "array table",
      input: {
        data: [{ ...minimalReport(), table: [] }],
      },
    },
    {
      name: "missing table",
      input: { data: [{ header: {}, businessObject: { name: "x" } }] },
    },
    {
      name: "invalid selected Header alias",
      input: {
        data: [
          {
            Header: 7,
            BusinessObject: { Name: "x" },
            Table: { columns: [{ Key: "x" }], rows: [] },
          },
        ],
      },
    },
    {
      name: "invalid selected BusinessObject alias",
      input: {
        data: [
          {
            Header: {},
            BusinessObject: 7,
            Table: { columns: [{ Key: "x" }], rows: [] },
          },
        ],
      },
    },
    {
      name: "invalid selected Table alias",
      input: {
        data: [
          {
            Header: {},
            BusinessObject: { Name: "x" },
            Table: 7,
          },
        ],
      },
    },
    {
      name: "empty columns",
      input: {
        data: [
          {
            header: {},
            businessObject: { name: "x" },
            table: { columns: [], rows: [] },
          },
        ],
      },
    },
    {
      name: "missing table fields",
      input: {
        data: [
          {
            header: {},
            businessObject: { name: "x" },
            table: {},
          },
        ],
      },
    },
    {
      name: "array column",
      input: {
        data: [
          {
            header: {},
            businessObject: { name: "x" },
            table: { columns: [[]], rows: [] },
          },
        ],
      },
    },
    {
      name: "invalid row collection",
      input: {
        data: [
          {
            header: {},
            businessObject: { name: "x" },
            table: { columns: [{ key: "x" }], rows: {} },
          },
        ],
      },
    },
    {
      name: "invalid row",
      input: {
        data: [
          {
            header: {},
            businessObject: { name: "x" },
            table: { columns: [{ key: "x" }], rows: [[]] },
          },
        ],
      },
    },
    {
      name: "invalid cell collection",
      input: {
        data: [
          {
            header: {},
            businessObject: { name: "x" },
            table: {
              columns: [{ key: "x" }],
              rows: [{ synthetic_row_001: {} }],
            },
          },
        ],
      },
    },
    {
      name: "blank names, keys, and labels",
      input: {
        data: [
          {
            header: {},
            businessObject: { name: "" },
            table: {
              columns: [{ key: "" }, { Key: " " }],
              rows: [
                {
                  synthetic_row_001: [
                    { label: "" },
                    { Label: " " },
                  ],
                },
              ],
            },
          },
        ],
      },
    },
    {
      name: "invalid cell scalar",
      input: {
        data: [
          {
            header: {},
            businessObject: { name: "x" },
            table: {
              columns: [{ key: "x" }],
              rows: [
                { synthetic_row_001: [{ label: "x", value: {} }] },
              ],
            },
          },
        ],
      },
    },
    {
      name: "blank cell label with an invalid scalar",
      input: {
        data: [
          {
            header: {},
            businessObject: { name: "x" },
            table: {
              columns: [{ key: "x" }],
              rows: [
                { synthetic_row_001: [{ label: " ", value: {} }] },
              ],
            },
          },
        ],
      },
    },
    {
      name: "array cell",
      input: {
        data: [
          {
            header: {},
            businessObject: { name: "x" },
            table: {
              columns: [{ key: "x" }],
              rows: [{ synthetic_row_001: [[]] }],
            },
          },
        ],
      },
    },
    {
      name: "invalid name alias",
      input: {
        data: [
          {
            header: {},
            businessObject: { Name: null, name: "x" },
            table: { columns: [{ key: "x" }], rows: [] },
          },
        ],
      },
    },
    {
      name: "invalid unselected aliases",
      input: {
        data: [
          {
            header: {},
            businessObject: { Name: "x", code: {} },
            table: {
              columns: [{ key: "x", Key: 7 }],
              rows: [
                {
                  synthetic_row_001: [
                    { label: "x", Label: 7, value: "x", Value: {} },
                  ],
                },
              ],
            },
          },
        ],
      },
    },
    {
      name: "invalid business scalar",
      input: {
        data: [
          {
            header: {},
            businessObject: { name: "x", code: {} },
            table: { columns: [{ key: "x" }], rows: [] },
          },
        ],
      },
    },
    {
      name: "blank business name with an invalid scalar",
      input: {
        data: [
          {
            header: {},
            businessObject: { name: " ", code: {} },
            table: { columns: [{ key: "x" }], rows: [] },
          },
        ],
      },
    },
    {
      name: "invalid business status",
      input: {
        data: [
          {
            header: {},
            businessObject: { name: "x", status: 7 },
            table: { columns: [{ key: "x" }], rows: [] },
          },
        ],
      },
    },
    {
      name: "invalid column header",
      input: {
        data: [
          {
            header: {},
            businessObject: { name: "x" },
            table: { columns: [{ key: "x", header: null }], rows: [] },
          },
        ],
      },
    },
    {
      name: "blank column key with an invalid header",
      input: {
        data: [
          {
            header: {},
            businessObject: { name: "x" },
            table: { columns: [{ key: " ", header: null }], rows: [] },
          },
        ],
      },
    },
  ];

  for (const invalidCase of cases) {
    test(`matches the oracle for ${invalidCase.name}`, () => {
      const oracle = currentZodAdapter.validate(fresh(invalidCase.input));
      if (oracle.success) {
        throw new Error("Current Zod unexpectedly accepted an invalid case");
      }

      for (const adapter of realAdapters()) {
        const result = adapter.validate(fresh(invalidCase.input));
        expect(result.success, adapter.name).toBeFalse();
        if (!result.success) {
          expect(result.issues, adapter.name).toEqual(oracle.issues);
        }
      }
    });
  }
});

describe("adapter input ownership", () => {
  test("records clone, mutation, and reuse ownership accurately", () => {
    const generated = generateSyntheticProfile("smoke", 20_260_807);

    for (const adapter of [currentZodAdapter, compiledZodAdapter]) {
      const input = fresh(generated.request);
      const result = adapter.validate(input);
      expect(result.success, adapter.name).toBeTrue();
      if (result.success) {
        expect(result.data).not.toBe(input);
      }
      expect(adapter.inputOwnership).toBe("clone");
    }

    for (const adapter of [ajvAdapter, typeboxAdapter, valibotAdapter]) {
      const input = fresh(generated.request);
      const result = adapter.validate(input);
      expect(result.success, adapter.name).toBeTrue();
      if (result.success) {
        expect(result.data).toBe(input);
      }
      expect(adapter.inputOwnership).toBe("mutate");
    }

    for (const adapter of [
      currentZodManualNormalizerAdapter,
      compiledZodManualNormalizerAdapter,
      typeboxNativeTransformAdapter,
      valibotNativeTransformAdapter,
    ]) {
      const input = fresh(generated.request);
      const result = adapter.validate(input);
      expect(result.success, adapter.name).toBeTrue();
      if (result.success) {
        expect(result.data).not.toBe(input);
      }
      expect(adapter.inputOwnership).toBe("mutate");
    }

    const noneInput = fresh(generated.request);
    const noneResult = noValidationAdapter.validate(noneInput);
    expect(noneResult.success).toBeTrue();
    if (noneResult.success) {
      expect(noneResult.data).toBe(noneInput);
    }
    expect(noValidationAdapter.inputOwnership).toBe("reuse");
  });

  test("records the Bun 1.3.14 fully bundled compatibility failure separately", () => {
    expect(fullyBundledRuntimeCompatible).toBeFalse();
  });

  test("uses TypeBox's accelerated compiler path", () => {
    expect(isTypeBoxAccelerated()).toBeTrue();
    expect(isDiagnosticTypeBoxAccelerated()).toBeTrue();
    expect(isTypeBoxNativeTransformAccelerated()).toBeTrue();
    expect(isDiagnosticTypeBoxNativeTransformAccelerated()).toBeTrue();
  });
});
