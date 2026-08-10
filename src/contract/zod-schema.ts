import { z } from "zod";
import {
  DIAGNOSTIC_MAX_REPORTS,
  PRODUCTION_MAX_REPORTS,
  type ValidationEnvelope,
} from "./limits";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const OptionalLooseTextSchema = z.coerce
  .string()
  .trim()
  .nullish()
  .transform((value) => value || undefined);

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
    const textValues = value
      .map(normalizeOptionalHeaderText)
      .filter((text): text is string => text !== undefined);

    return textValues.length > 0 ? textValues.join(", ") : undefined;
  }

  if (typeof value === "object") {
    return undefined;
  }

  const text = String(value).trim();
  if (!text) {
    return undefined;
  }

  if (typeof value === "string") {
    const parsedArray = parseStringifiedArray(text);
    if (parsedArray) {
      return normalizeOptionalHeaderText(parsedArray);
    }
  }

  return text;
}

const OptionalHeaderTextSchema = z
  .unknown()
  .transform(normalizeOptionalHeaderText);

const CellValueSchema = z
  .union([z.string(), z.number(), z.boolean()])
  .nullish();
const OptionalCellValueTextSchema = CellValueSchema.transform(
  (value) => value?.toString().trim() || undefined,
);
const OptionalStringTextSchema = z
  .string()
  .optional()
  .transform((value) => value?.trim() || undefined);
const CanonicalOptionalTextSchema = z
  .string()
  .transform((value) => value || undefined);

const CellInputSchema = z
  .object({
    label: z.string().optional(),
    Label: z.string().optional(),
    value: CellValueSchema,
    Value: CellValueSchema,
  })
  .transform((item) => ({
    label: item.label ?? item.Label ?? "",
    value: item.value ?? item.Value ?? "",
  }));

export const StructuredReportCellSchema = CellInputSchema.pipe(
  z.object({
    label: z
      .string({ error: "Cell items must include label or Label" })
      .trim()
      .min(1, { error: "Cell items must include label or Label" }),
    value: z
      .union([z.string(), z.number(), z.boolean()])
      .transform((value) => value.toString()),
  }),
);

const ColumnInputSchema = z
  .object({
    key: z.string().optional(),
    Key: z.string().optional(),
    header: z.string().optional(),
    Header: z.string().optional(),
  })
  .transform((column) => ({
    key: column.key ?? column.Key ?? "",
    header: column.header ?? column.Header ?? null,
  }));

export const StructuredReportColumnSchema = ColumnInputSchema.pipe(
  z
    .object({
      key: z
        .string({ error: "Columns must include key or Key" })
        .trim()
        .min(1, { error: "Columns must include key or Key" }),
      header: z.union([z.string().trim(), z.null()]),
    })
    .transform((column) => ({
      key: column.key,
      header: column.header ?? column.key,
    })),
);

export const StructuredReportRowSchema = z.record(
  z.string(),
  z.array(StructuredReportCellSchema),
);

export const StructuredReportTableSchema = z
  .object({
    columns: z.array(StructuredReportColumnSchema).min(1),
    rows: z.array(StructuredReportRowSchema),
  })
  .transform((table) => ({
    columns: table.columns,
    rows: table.rows,
  }));

const HeaderInputSchema = z.object({
  title: OptionalLooseTextSchema.optional(),
  Title: OptionalLooseTextSchema.optional(),
  subtitle: OptionalLooseTextSchema.optional(),
  Subtitle: OptionalLooseTextSchema.optional(),
  reportSubtitle: OptionalLooseTextSchema.optional(),
  ReportSubtitle: OptionalLooseTextSchema.optional(),
  label: OptionalHeaderTextSchema.optional(),
  Label: OptionalHeaderTextSchema.optional(),
  value: OptionalHeaderTextSchema.optional(),
  Value: OptionalHeaderTextSchema.optional(),
  timePeriod: OptionalLooseTextSchema.optional(),
  TimePeriod: OptionalLooseTextSchema.optional(),
  academicYear: OptionalLooseTextSchema.optional(),
  AcademicYear: OptionalLooseTextSchema.optional(),
  academic_year: OptionalLooseTextSchema.optional(),
  missionStatement: OptionalLooseTextSchema.optional(),
  MissionStatement: OptionalLooseTextSchema.optional(),
  mission_statement: OptionalLooseTextSchema.optional(),
});

export const StructuredReportHeaderSchema = HeaderInputSchema.transform(
  (header) => ({
    title: header.title ?? header.Title,
    subtitle:
      header.subtitle ??
      header.Subtitle ??
      header.reportSubtitle ??
      header.ReportSubtitle,
    label: header.label ?? header.Label,
    value: header.value ?? header.Value,
    timePeriod:
      header.timePeriod ??
      header.TimePeriod ??
      header.academicYear ??
      header.AcademicYear ??
      header.academic_year,
    missionStatement:
      header.missionStatement ??
      header.MissionStatement ??
      header.mission_statement,
  }),
);

const BusinessObjectInputSchema = z
  .object({
    Name: z.string().optional(),
    name: z.string().optional(),
    Code: OptionalCellValueTextSchema,
    code: OptionalCellValueTextSchema,
    Id: OptionalCellValueTextSchema,
    id: OptionalCellValueTextSchema,
    Status: OptionalStringTextSchema,
    status: OptionalStringTextSchema,
  })
  .transform((businessObject) => ({
    name: businessObject.Name ?? businessObject.name ?? "",
    code: businessObject.Code ?? businessObject.code ?? "",
    id: businessObject.Id ?? businessObject.id ?? "",
    status: businessObject.Status ?? businessObject.status ?? "",
  }));

export const StructuredReportBusinessObjectSchema =
  BusinessObjectInputSchema.pipe(
    z.object({
      name: z
        .string({ error: "businessObject must include Name or name" })
        .trim()
        .min(1, { error: "businessObject must include Name or name" }),
      code: CanonicalOptionalTextSchema,
      id: CanonicalOptionalTextSchema,
      status: CanonicalOptionalTextSchema,
    }),
  );

const StructuredReportCoreSchema = z
  .object({
    templateName: z.string().optional(),
    header: StructuredReportHeaderSchema,
    businessObject: StructuredReportBusinessObjectSchema,
    table: StructuredReportTableSchema,
  })
  .transform((report) => ({
    ...report,
    templateName: report.templateName?.trim() || undefined,
  }));

export const StructuredReportSchema = z.preprocess((value) => {
  if (!isRecord(value)) {
    return value;
  }

  return {
    ...value,
    header: value.header ?? value.Header ?? {},
    businessObject: value.businessObject ?? value.BusinessObject,
    table: value.table ?? value.Table,
  };
}, StructuredReportCoreSchema);

export const StructuredReportRequestSchema = z.strictObject({
  data: z
    .array(StructuredReportSchema)
    .min(1)
    .max(PRODUCTION_MAX_REPORTS),
});

export const DiagnosticStructuredReportRequestSchema = z.strictObject({
  data: z
    .array(StructuredReportSchema)
    .min(1)
    .max(DIAGNOSTIC_MAX_REPORTS),
});

export function structuredReportRequestSchemaForEnvelope(
  envelope: ValidationEnvelope,
): typeof StructuredReportRequestSchema {
  return envelope === "production"
    ? StructuredReportRequestSchema
    : DiagnosticStructuredReportRequestSchema;
}

export type StructuredReportCell = z.infer<typeof StructuredReportCellSchema>;
export type StructuredReportColumn = z.infer<
  typeof StructuredReportColumnSchema
>;
export type StructuredReportRow = z.infer<typeof StructuredReportRowSchema>;
export type StructuredReportTable = z.infer<typeof StructuredReportTableSchema>;
export type StructuredReportHeader = z.infer<
  typeof StructuredReportHeaderSchema
>;
export type StructuredReportBusinessObject = z.infer<
  typeof StructuredReportBusinessObjectSchema
>;
export type StructuredReport = z.infer<typeof StructuredReportSchema>;
export type StructuredReportRequest = z.infer<
  typeof StructuredReportRequestSchema
>;
