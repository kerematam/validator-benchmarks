import Type from "typebox";
import {
  DIAGNOSTIC_MAX_REPORTS,
  PRODUCTION_MAX_REPORTS,
} from "./limits";

const ScalarSchema = Type.Union([
  Type.String(),
  Type.Number(),
  Type.Boolean(),
  Type.Null(),
]);

function optionalScalarText(
  value: string | number | boolean | null | undefined,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return String(value).trim() || undefined;
}

function optionalStringText(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStringifiedArray(value: string): unknown[] | undefined {
  if (!value.startsWith("[") || !value.endsWith("]")) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function normalizeOptionalHeaderText(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (Array.isArray(value)) {
    const values = value
      .map(normalizeOptionalHeaderText)
      .filter((text): text is string => text !== undefined);
    return values.length > 0 ? values.join(", ") : undefined;
  }
  if (typeof value === "object") {
    return undefined;
  }

  const text = String(value).trim();
  if (!text) {
    return undefined;
  }
  if (typeof value === "string") {
    const parsed = parseStringifiedArray(text);
    if (parsed !== undefined) {
      return normalizeOptionalHeaderText(parsed);
    }
  }
  return text;
}

function pickOptionalText(
  source: Record<string, unknown>,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (value === undefined || value === null) {
      continue;
    }
    const text = String(value).trim();
    if (text) {
      return text;
    }
  }
  return undefined;
}

function pickOptionalHeaderText(
  source: Record<string, unknown>,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const text = normalizeOptionalHeaderText(source[key]);
    if (text !== undefined) {
      return text;
    }
  }
  return undefined;
}

function decodeHeader(value: unknown) {
  if (!isRecord(value)) {
    throw new Error("TypeBox decoded a non-object header");
  }
  return {
    title: pickOptionalText(value, ["title", "Title"]),
    subtitle: pickOptionalText(value, [
      "subtitle",
      "Subtitle",
      "reportSubtitle",
      "ReportSubtitle",
    ]),
    label: pickOptionalHeaderText(value, ["label", "Label"]),
    value: pickOptionalHeaderText(value, ["value", "Value"]),
    timePeriod: pickOptionalText(value, [
      "timePeriod",
      "TimePeriod",
      "academicYear",
      "AcademicYear",
      "academic_year",
    ]),
    missionStatement: pickOptionalText(value, [
      "missionStatement",
      "MissionStatement",
      "mission_statement",
    ]),
  };
}

const RawCellSchema = Type.Object(
  {
    label: Type.Optional(Type.String()),
    Label: Type.Optional(Type.String()),
    value: Type.Optional(ScalarSchema),
    Value: Type.Optional(ScalarSchema),
  },
  { additionalProperties: true },
);

const NativeCellSchema = Type.Decode(RawCellSchema, (cell) => ({
  label: (cell.label ?? cell.Label ?? "").trim(),
  value: String(cell.value ?? cell.Value ?? ""),
}));

const RawColumnSchema = Type.Object(
  {
    key: Type.Optional(Type.String()),
    Key: Type.Optional(Type.String()),
    header: Type.Optional(Type.String()),
    Header: Type.Optional(Type.String()),
  },
  { additionalProperties: true },
);

const NativeColumnSchema = Type.Decode(RawColumnSchema, (column) => {
  const key = (column.key ?? column.Key ?? "").trim();
  const header = column.header ?? column.Header;
  return { key, header: header === undefined ? key : header.trim() };
});

const NativeRowSchema = Type.Record(
  Type.String(),
  Type.Array(NativeCellSchema),
);

const RawTableSchema = Type.Object(
  {
    columns: Type.Array(NativeColumnSchema, { minItems: 1 }),
    rows: Type.Array(NativeRowSchema),
  },
  { additionalProperties: true },
);

const NativeTableSchema = Type.Decode(RawTableSchema, (table) => ({
  columns: table.columns,
  rows: table.rows,
}));

const RawBusinessObjectSchema = Type.Object(
  {
    Name: Type.Optional(Type.String()),
    name: Type.Optional(Type.String()),
    Code: Type.Optional(ScalarSchema),
    code: Type.Optional(ScalarSchema),
    Id: Type.Optional(ScalarSchema),
    id: Type.Optional(ScalarSchema),
    Status: Type.Optional(Type.String()),
    status: Type.Optional(Type.String()),
  },
  { additionalProperties: true },
);

const NativeBusinessObjectSchema = Type.Decode(
  RawBusinessObjectSchema,
  (businessObject) => ({
    name: (businessObject.Name ?? businessObject.name ?? "").trim(),
    code:
      optionalScalarText(businessObject.Code) ??
      optionalScalarText(businessObject.code),
    id:
      optionalScalarText(businessObject.Id) ??
      optionalScalarText(businessObject.id),
    status:
      optionalStringText(businessObject.Status) ??
      optionalStringText(businessObject.status),
  }),
);

const RawHeaderSchema = Type.Object({}, { additionalProperties: true });
const NativeHeaderSchema = Type.Decode(RawHeaderSchema, decodeHeader);

const RawReportSchema = Type.Object(
  {
    templateName: Type.Optional(Type.String()),
    header: NativeHeaderSchema,
    businessObject: NativeBusinessObjectSchema,
    table: NativeTableSchema,
  },
  { additionalProperties: true },
);

const NativeReportSchema = Type.Decode(RawReportSchema, (report) => ({
  templateName: report.templateName?.trim() || undefined,
  header: report.header,
  businessObject: report.businessObject,
  table: report.table,
}));

function createNativeTransformInputSchema(maximumReports: number) {
  return Type.Object(
    {
      data: Type.Array(NativeReportSchema, {
        minItems: 1,
        maxItems: maximumReports,
      }),
    },
    { additionalProperties: false },
  );
}

const NormalizedHeaderSchema = Type.Object(
  {
    title: Type.Optional(Type.String()),
    subtitle: Type.Optional(Type.String()),
    label: Type.Optional(Type.String()),
    value: Type.Optional(Type.String()),
    timePeriod: Type.Optional(Type.String()),
    missionStatement: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

const NormalizedBusinessObjectSchema = Type.Object(
  {
    name: Type.String({ minLength: 1 }),
    code: Type.Optional(Type.String()),
    id: Type.Optional(Type.String()),
    status: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

const NormalizedCellSchema = Type.Object(
  {
    label: Type.String({ minLength: 1 }),
    value: Type.String(),
  },
  { additionalProperties: false },
);

const NormalizedColumnSchema = Type.Object(
  {
    key: Type.String({ minLength: 1 }),
    header: Type.String(),
  },
  { additionalProperties: false },
);

const NormalizedRowSchema = Type.Record(
  Type.String(),
  Type.Array(NormalizedCellSchema),
);

const NormalizedTableSchema = Type.Object(
  {
    columns: Type.Array(NormalizedColumnSchema, { minItems: 1 }),
    rows: Type.Array(NormalizedRowSchema),
  },
  { additionalProperties: false },
);

const NormalizedReportSchema = Type.Object(
  {
    templateName: Type.Optional(Type.String()),
    header: NormalizedHeaderSchema,
    businessObject: NormalizedBusinessObjectSchema,
    table: NormalizedTableSchema,
  },
  { additionalProperties: false },
);

function createNormalizedOutputSchema(maximumReports: number) {
  return Type.Object(
    {
      data: Type.Array(NormalizedReportSchema, {
        minItems: 1,
        maxItems: maximumReports,
      }),
    },
    { additionalProperties: false },
  );
}

export const TYPEBOX_NATIVE_TRANSFORM_INPUT_SCHEMA =
  createNativeTransformInputSchema(PRODUCTION_MAX_REPORTS);
export const DIAGNOSTIC_TYPEBOX_NATIVE_TRANSFORM_INPUT_SCHEMA =
  createNativeTransformInputSchema(DIAGNOSTIC_MAX_REPORTS);
export const TYPEBOX_NORMALIZED_OUTPUT_SCHEMA =
  createNormalizedOutputSchema(PRODUCTION_MAX_REPORTS);
export const DIAGNOSTIC_TYPEBOX_NORMALIZED_OUTPUT_SCHEMA =
  createNormalizedOutputSchema(DIAGNOSTIC_MAX_REPORTS);
