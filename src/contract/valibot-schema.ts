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

const CellSchema = v.pipe(
  RecordValueSchema,
  v.object({
    label: v.optional(v.string()),
    Label: v.optional(v.string()),
    value: v.optional(ScalarSchema),
    Value: v.optional(ScalarSchema),
  }),
);

const ColumnSchema = v.pipe(
  RecordValueSchema,
  v.object({
    key: v.optional(v.string()),
    Key: v.optional(v.string()),
    header: v.optional(v.string()),
    Header: v.optional(v.string()),
  }),
);

const RowSchema = v.pipe(
  RecordValueSchema,
  v.record(v.string(), v.array(CellSchema)),
);

const TableSchema = v.pipe(
  RecordValueSchema,
  v.object({
    columns: v.pipe(v.array(ColumnSchema), v.minLength(1)),
    rows: v.array(RowSchema),
  }),
);

const BusinessObjectSchema = v.pipe(
  RecordValueSchema,
  v.object({
    Name: v.optional(v.string()),
    name: v.optional(v.string()),
    Code: v.optional(ScalarSchema),
    code: v.optional(ScalarSchema),
    Id: v.optional(ScalarSchema),
    id: v.optional(ScalarSchema),
    Status: v.optional(v.string()),
    status: v.optional(v.string()),
  }),
);

const HeaderSchema = v.pipe(RecordValueSchema, v.object({}));

const ReportSchema = v.pipe(
  RecordValueSchema,
  v.object({
    templateName: v.optional(v.string()),
    header: HeaderSchema,
    businessObject: BusinessObjectSchema,
    table: TableSchema,
  }),
);

function createStructuredReportValibotSchema(maximumReports: number) {
  return v.pipe(
    RecordValueSchema,
    v.strictObject({
      data: v.pipe(
        v.array(ReportSchema),
        v.minLength(1),
        v.maxLength(maximumReports),
      ),
    }),
  );
}

export const STRUCTURED_REPORT_VALIBOT_SCHEMA =
  createStructuredReportValibotSchema(PRODUCTION_MAX_REPORTS);

export const DIAGNOSTIC_STRUCTURED_REPORT_VALIBOT_SCHEMA =
  createStructuredReportValibotSchema(DIAGNOSTIC_MAX_REPORTS);
