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

const CellSchema = Type.Object(
  {
    label: Type.Optional(Type.String()),
    Label: Type.Optional(Type.String()),
    value: Type.Optional(ScalarSchema),
    Value: Type.Optional(ScalarSchema),
  },
  { additionalProperties: true },
);

const ColumnSchema = Type.Object(
  {
    key: Type.Optional(Type.String()),
    Key: Type.Optional(Type.String()),
    header: Type.Optional(Type.String()),
    Header: Type.Optional(Type.String()),
  },
  { additionalProperties: true },
);

const RowSchema = Type.Record(Type.String(), Type.Array(CellSchema));

const TableSchema = Type.Object(
  {
    columns: Type.Array(ColumnSchema, { minItems: 1 }),
    rows: Type.Array(RowSchema),
  },
  { additionalProperties: true },
);

const BusinessObjectSchema = Type.Object(
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

const HeaderSchema = Type.Object({}, { additionalProperties: true });

const ReportSchema = Type.Object(
  {
    templateName: Type.Optional(Type.String()),
    header: HeaderSchema,
    businessObject: BusinessObjectSchema,
    table: TableSchema,
  },
  { additionalProperties: true },
);

function createStructuredReportTypeBoxSchema(maximumReports: number) {
  return Type.Object(
    {
      data: Type.Array(ReportSchema, {
        minItems: 1,
        maxItems: maximumReports,
      }),
    },
    { additionalProperties: false },
  );
}

export const STRUCTURED_REPORT_TYPEBOX_SCHEMA =
  createStructuredReportTypeBoxSchema(PRODUCTION_MAX_REPORTS);

export const DIAGNOSTIC_STRUCTURED_REPORT_TYPEBOX_SCHEMA =
  createStructuredReportTypeBoxSchema(DIAGNOSTIC_MAX_REPORTS);
