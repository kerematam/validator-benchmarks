import { describe, expect, test } from "bun:test";
import { PRODUCTION_MAX_REPORTS } from "../src/contract/limits";
import { StructuredReportRequestSchema } from "../src/contract/zod-schema";

function minimalReport(): Record<string, unknown> {
  return {
    header: {},
    businessObject: { name: "Synthetic Object" },
    table: {
      columns: [{ key: "column_01" }],
      rows: [
        {
          row_01: [{ label: "Synthetic Label", value: "Synthetic Value" }],
        },
      ],
    },
  };
}

function readProperty(value: unknown, key: string): unknown {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return undefined;
  }

  for (const [entryKey, entryValue] of Object.entries(value)) {
    if (entryKey === key) {
      return entryValue;
    }
  }

  return undefined;
}

describe("Zod 4.5 contract snapshot", () => {
  test("normalizes a hand-written canonical request to the complete expected value", () => {
    const input: unknown = {
      data: [
        {
          templateName: " synthetic-template ",
          header: {
            title: " Synthetic Title ",
            subtitle: " ",
            ReportSubtitle: " Synthetic Fallback Subtitle ",
            label: '[" Synthetic Label ",12,true,null,{"ignored":true}]',
            value: [" Synthetic Value ", false, null],
            academic_year: " Synthetic Period ",
            mission_statement: " Synthetic Mission ",
            syntheticUnknownHeader: "Synthetic Header Unknown",
          },
          businessObject: {
            name: " Synthetic Object ",
            code: 42,
            id: false,
            status: " Synthetic Status ",
            syntheticDroppedObjectField: "Synthetic Dropped",
          },
          table: {
            columns: [
              {
                key: " column_01 ",
                header: "",
                syntheticDroppedColumnField: "Synthetic Dropped",
              },
              { Key: " column_02 ", Header: " Column 02 " },
            ],
            rows: [
              {
                row_01: [
                  {
                    label: " Cell 01 ",
                    value: 0,
                    syntheticDroppedCellField: "Synthetic Dropped",
                  },
                  { Label: " Cell 02 ", Value: false },
                ],
              },
            ],
            syntheticDroppedTableField: "Synthetic Dropped",
          },
          syntheticReportField: "Synthetic Report Unknown",
        },
      ],
    };

    const normalized: unknown = StructuredReportRequestSchema.parse(input);
    expect(normalized).toEqual({
      data: [
        {
          templateName: "synthetic-template",
          header: {
            title: "Synthetic Title",
            subtitle: "Synthetic Fallback Subtitle",
            label: "Synthetic Label, 12, true",
            value: "Synthetic Value, false",
            timePeriod: "Synthetic Period",
            missionStatement: "Synthetic Mission",
          },
          businessObject: {
            name: "Synthetic Object",
            code: "42",
            id: "false",
            status: "Synthetic Status",
          },
          table: {
            columns: [
              { key: "column_01", header: "" },
              { key: "column_02", header: "Column 02" },
            ],
            rows: [
              {
                row_01: [
                  { label: "Cell 01", value: "0" },
                  { label: "Cell 02", value: "false" },
                ],
              },
            ],
          },
        },
      ],
    });
  });

  test("accepts PascalCase containers and strips non-canonical fields", () => {
    const result = StructuredReportRequestSchema.parse({
      data: [
        {
          Header: { Title: " Synthetic Pascal Title " },
          BusinessObject: { Name: " Synthetic Pascal Object ", Code: null },
          Table: {
            columns: [{ Key: " synthetic_column_01 " }],
            rows: [
              {
                synthetic_row_001: [
                  { Label: " Synthetic Pascal Cell ", Value: true },
                ],
              },
            ],
          },
        },
      ],
    });
    const report = result.data[0];

    expect(report?.header.title).toBe("Synthetic Pascal Title");
    expect(report?.businessObject).toEqual({
      name: "Synthetic Pascal Object",
      code: undefined,
      id: undefined,
      status: undefined,
    });
    expect(report?.table.columns).toEqual([
      { key: "synthetic_column_01", header: "synthetic_column_01" },
    ]);
    expect(report?.table.rows[0]?.synthetic_row_001).toEqual([
      { label: "Synthetic Pascal Cell", value: "true" },
    ]);
    expect(readProperty(report, "Header")).toBeUndefined();
    expect(readProperty(report, "BusinessObject")).toBeUndefined();
    expect(readProperty(report, "Table")).toBeUndefined();
  });

  test("preserves each field's declared mixed-alias precedence", () => {
    const result = StructuredReportRequestSchema.parse({
      data: [
        {
          header: {
            title: " Lowercase Title ",
            Title: " Pascal Title ",
            subtitle: "",
            Subtitle: " Pascal Subtitle ",
          },
          Header: { title: " Unselected Header " },
          businessObject: {
            Name: " Pascal Name ",
            name: " Lowercase Name ",
            Code: "PASCAL-CODE",
            code: "lowercase-code",
          },
          table: {
            columns: [
              {
                key: " lowercase_key ",
                Key: " Pascal_Key ",
                header: " Lowercase Header ",
                Header: " Pascal Header ",
              },
            ],
            rows: [
              {
                row_01: [
                  {
                    label: " Lowercase Label ",
                    Label: " Pascal Label ",
                    value: 0,
                    Value: 99,
                  },
                ],
              },
            ],
          },
        },
      ],
    });
    const report = result.data[0];

    expect(report?.header.title).toBe("Lowercase Title");
    expect(report?.header.subtitle).toBe("Pascal Subtitle");
    expect(report?.businessObject.name).toBe("Pascal Name");
    expect(report?.businessObject.code).toBe("PASCAL-CODE");
    expect(report?.table.columns[0]).toEqual({
      key: "lowercase_key",
      header: "Lowercase Header",
    });
    expect(report?.table.rows[0]?.row_01?.[0]).toEqual({
      label: "Lowercase Label",
      value: "0",
    });
  });
});

describe("Zod 4.5 invalid-input behavior", () => {
  const invalidCases: readonly {
    readonly name: string;
    readonly input: unknown;
    readonly expectedPath: PropertyKey[];
  }[] = [
    { name: "missing envelope", input: undefined, expectedPath: [] },
    { name: "non-object envelope", input: [], expectedPath: [] },
    { name: "missing data", input: {}, expectedPath: ["data"] },
    { name: "empty data", input: { data: [] }, expectedPath: ["data"] },
    { name: "non-array data", input: { data: {} }, expectedPath: ["data"] },
    {
      name: "extra top-level key",
      input: { data: [minimalReport()], extra: true },
      expectedPath: [],
    },
    {
      name: "missing business object",
      input: {
        data: [{ header: {}, table: { columns: [{ key: "x" }], rows: [] } }],
      },
      expectedPath: ["data", 0, "businessObject"],
    },
    {
      name: "missing table",
      input: { data: [{ header: {}, businessObject: { name: "x" } }] },
      expectedPath: ["data", 0, "table"],
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
      expectedPath: ["data", 0, "table", "columns"],
    },
    {
      name: "invalid rows container",
      input: {
        data: [
          {
            header: {},
            businessObject: { name: "x" },
            table: { columns: [{ key: "x" }], rows: {} },
          },
        ],
      },
      expectedPath: ["data", 0, "table", "rows"],
    },
    {
      name: "invalid row container",
      input: {
        data: [
          {
            header: {},
            businessObject: { name: "x" },
            table: { columns: [{ key: "x" }], rows: [[]] },
          },
        ],
      },
      expectedPath: ["data", 0, "table", "rows", 0],
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
              rows: [{ row_01: {} }],
            },
          },
        ],
      },
      expectedPath: ["data", 0, "table", "rows", 0, "row_01"],
    },
    {
      name: "blank business object name",
      input: {
        data: [
          {
            header: {},
            businessObject: { name: " " },
            table: { columns: [{ key: "x" }], rows: [] },
          },
        ],
      },
      expectedPath: ["data", 0, "businessObject", "name"],
    },
    {
      name: "blank column key",
      input: {
        data: [
          {
            header: {},
            businessObject: { name: "x" },
            table: { columns: [{ key: " " }], rows: [] },
          },
        ],
      },
      expectedPath: ["data", 0, "table", "columns", 0, "key"],
    },
    {
      name: "blank cell label",
      input: {
        data: [
          {
            header: {},
            businessObject: { name: "x" },
            table: {
              columns: [{ key: "x" }],
              rows: [{ row_01: [{ label: " " }] }],
            },
          },
        ],
      },
      expectedPath: [
        "data",
        0,
        "table",
        "rows",
        0,
        "row_01",
        0,
        "label",
      ],
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
              rows: [{ row_01: [{ label: "x", value: {} }] }],
            },
          },
        ],
      },
      expectedPath: [
        "data",
        0,
        "table",
        "rows",
        0,
        "row_01",
        0,
        "value",
      ],
    },
    {
      name: "invalid business-object scalar",
      input: {
        data: [
          {
            header: {},
            businessObject: { name: "x", code: {} },
            table: { columns: [{ key: "x" }], rows: [] },
          },
        ],
      },
      expectedPath: ["data", 0, "businessObject", "code"],
    },
  ];

  for (const invalidCase of invalidCases) {
    test(`rejects ${invalidCase.name}`, () => {
      const result = StructuredReportRequestSchema.safeParse(invalidCase.input);
      if (result.success) {
        throw new Error("Expected invalid input to fail");
      }

      expect(result.error.issues[0]?.path).toEqual(invalidCase.expectedPath);
    });
  }

  test("rejects the first report beyond the production maximum", () => {
    const reports = Array.from(
      { length: PRODUCTION_MAX_REPORTS + 1 },
      minimalReport,
    );
    const result = StructuredReportRequestSchema.safeParse({ data: reports });
    if (result.success) {
      throw new Error("Expected an oversized production request to fail");
    }

    expect(result.error.issues[0]?.path).toEqual(["data"]);
  });

  test.each([0, 5, 9])(
    "reports a blank name at array position %i",
    (invalidIndex) => {
      const reports = Array.from({ length: 10 }, minimalReport);
      reports[invalidIndex] = {
        ...minimalReport(),
        businessObject: { name: "" },
      };
      const result = StructuredReportRequestSchema.safeParse({ data: reports });
      if (result.success) {
        throw new Error("Expected positioned invalid input to fail");
      }

      expect(result.error.issues[0]?.path).toEqual([
        "data",
        invalidIndex,
        "businessObject",
        "name",
      ]);
    },
  );

  test("retains multiple current-Zod issues", () => {
    const input = minimalReport();
    input.businessObject = { name: "" };
    input.table = {
      columns: [{ key: "" }, { key: "" }],
      rows: [{ row_01: [{ label: "" }, { label: "" }] }],
    };
    const result = StructuredReportRequestSchema.safeParse({ data: [input] });
    if (result.success) {
      throw new Error("Expected multi-issue input to fail");
    }

    expect(result.error.issues.length).toBe(5);
  });
});
