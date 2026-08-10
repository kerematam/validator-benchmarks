import * as v from "valibot";
import {
  DIAGNOSTIC_MAX_REPORTS,
  PRODUCTION_MAX_REPORTS,
} from "./limits";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const RecordValueSchema = v.custom<Record<string, unknown>>(isRecord);
const ScalarSchema = v.union([
  v.string(),
  v.number(),
  v.boolean(),
  v.null(),
]);
const NonNullScalarSchema = v.union([
  v.string(),
  v.number(),
  v.boolean(),
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

function optionalLooseText(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return String(value).trim() || undefined;
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

const NativeCellSchema = v.pipe(
  RecordValueSchema,
  v.object({
    label: v.optional(v.string()),
    Label: v.optional(v.string()),
    value: v.optional(ScalarSchema),
    Value: v.optional(ScalarSchema),
  }),
  v.transform((cell) => ({
    label: cell.label ?? cell.Label ?? "",
    value: cell.value ?? cell.Value ?? "",
  })),
  v.object({
    label: v.pipe(v.string(), v.trim(), v.minLength(1)),
    value: v.pipe(
      NonNullScalarSchema,
      v.transform((value) => String(value)),
    ),
  }),
);

const NativeColumnSchema = v.pipe(
  RecordValueSchema,
  v.object({
    key: v.optional(v.string()),
    Key: v.optional(v.string()),
    header: v.optional(v.string()),
    Header: v.optional(v.string()),
  }),
  v.transform((column) => ({
    key: column.key ?? column.Key ?? "",
    header: column.header ?? column.Header ?? null,
  })),
  v.object({
    key: v.pipe(v.string(), v.trim(), v.minLength(1)),
    header: v.union([v.pipe(v.string(), v.trim()), v.null()]),
  }),
  v.transform((column) => ({
    key: column.key,
    header: column.header ?? column.key,
  })),
);

const NativeRowSchema = v.pipe(
  RecordValueSchema,
  v.record(v.string(), v.array(NativeCellSchema)),
);

const NativeTableSchema = v.pipe(
  RecordValueSchema,
  v.object({
    columns: v.pipe(v.array(NativeColumnSchema), v.minLength(1)),
    rows: v.array(NativeRowSchema),
  }),
);

const OptionalScalarTextSchema = v.pipe(
  v.optional(ScalarSchema),
  v.transform(optionalScalarText),
);
const OptionalStringTextSchema = v.pipe(
  v.optional(v.string()),
  v.transform(optionalStringText),
);

const NativeBusinessObjectSchema = v.pipe(
  RecordValueSchema,
  v.object({
    Name: v.optional(v.string()),
    name: v.optional(v.string()),
    Code: OptionalScalarTextSchema,
    code: OptionalScalarTextSchema,
    Id: OptionalScalarTextSchema,
    id: OptionalScalarTextSchema,
    Status: OptionalStringTextSchema,
    status: OptionalStringTextSchema,
  }),
  v.transform((businessObject) => ({
    name: businessObject.Name ?? businessObject.name ?? "",
    code: businessObject.Code ?? businessObject.code,
    id: businessObject.Id ?? businessObject.id,
    status: businessObject.Status ?? businessObject.status,
  })),
  v.object({
    name: v.pipe(v.string(), v.trim(), v.minLength(1)),
    code: v.optional(v.string()),
    id: v.optional(v.string()),
    status: v.optional(v.string()),
  }),
);

const NativeHeaderSchema = v.pipe(
  RecordValueSchema,
  v.object({
    title: v.optional(v.unknown()),
    Title: v.optional(v.unknown()),
    subtitle: v.optional(v.unknown()),
    Subtitle: v.optional(v.unknown()),
    reportSubtitle: v.optional(v.unknown()),
    ReportSubtitle: v.optional(v.unknown()),
    label: v.optional(v.unknown()),
    Label: v.optional(v.unknown()),
    value: v.optional(v.unknown()),
    Value: v.optional(v.unknown()),
    timePeriod: v.optional(v.unknown()),
    TimePeriod: v.optional(v.unknown()),
    academicYear: v.optional(v.unknown()),
    AcademicYear: v.optional(v.unknown()),
    academic_year: v.optional(v.unknown()),
    missionStatement: v.optional(v.unknown()),
    MissionStatement: v.optional(v.unknown()),
    mission_statement: v.optional(v.unknown()),
  }),
  v.transform((header) => ({
    title:
      optionalLooseText(header.title) ?? optionalLooseText(header.Title),
    subtitle:
      optionalLooseText(header.subtitle) ??
      optionalLooseText(header.Subtitle) ??
      optionalLooseText(header.reportSubtitle) ??
      optionalLooseText(header.ReportSubtitle),
    label:
      normalizeOptionalHeaderText(header.label) ??
      normalizeOptionalHeaderText(header.Label),
    value:
      normalizeOptionalHeaderText(header.value) ??
      normalizeOptionalHeaderText(header.Value),
    timePeriod:
      optionalLooseText(header.timePeriod) ??
      optionalLooseText(header.TimePeriod) ??
      optionalLooseText(header.academicYear) ??
      optionalLooseText(header.AcademicYear) ??
      optionalLooseText(header.academic_year),
    missionStatement:
      optionalLooseText(header.missionStatement) ??
      optionalLooseText(header.MissionStatement) ??
      optionalLooseText(header.mission_statement),
  })),
);

const NativeReportSchema = v.pipe(
  RecordValueSchema,
  v.object({
    templateName: v.optional(v.string()),
    header: NativeHeaderSchema,
    businessObject: NativeBusinessObjectSchema,
    table: NativeTableSchema,
  }),
  v.transform((report) => ({
    ...report,
    templateName: report.templateName?.trim() || undefined,
  })),
);

function createNativeTransformSchema(maximumReports: number) {
  return v.pipe(
    RecordValueSchema,
    v.strictObject({
      data: v.pipe(
        v.array(NativeReportSchema),
        v.minLength(1),
        v.maxLength(maximumReports),
      ),
    }),
  );
}

export const VALIBOT_NATIVE_TRANSFORM_SCHEMA =
  createNativeTransformSchema(PRODUCTION_MAX_REPORTS);
export const DIAGNOSTIC_VALIBOT_NATIVE_TRANSFORM_SCHEMA =
  createNativeTransformSchema(DIAGNOSTIC_MAX_REPORTS);
