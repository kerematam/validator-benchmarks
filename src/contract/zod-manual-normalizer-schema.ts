import { z } from "zod";
import {
  DIAGNOSTIC_MAX_REPORTS,
  PRODUCTION_MAX_REPORTS,
} from "./limits";

const RawScalarSchema = z
  .union([z.string(), z.number(), z.boolean()])
  .nullish();

const RawCellSchema = z.object({
  label: z.string().optional(),
  Label: z.string().optional(),
  value: RawScalarSchema,
  Value: RawScalarSchema,
});

const RawColumnSchema = z.object({
  key: z.string().optional(),
  Key: z.string().optional(),
  header: z.string().optional(),
  Header: z.string().optional(),
});

const RawRowSchema = z.record(z.string(), z.array(RawCellSchema));

const RawHeaderSchema = z.object({
  title: z.unknown().optional(),
  Title: z.unknown().optional(),
  subtitle: z.unknown().optional(),
  Subtitle: z.unknown().optional(),
  reportSubtitle: z.unknown().optional(),
  ReportSubtitle: z.unknown().optional(),
  label: z.unknown().optional(),
  Label: z.unknown().optional(),
  value: z.unknown().optional(),
  Value: z.unknown().optional(),
  timePeriod: z.unknown().optional(),
  TimePeriod: z.unknown().optional(),
  academicYear: z.unknown().optional(),
  AcademicYear: z.unknown().optional(),
  academic_year: z.unknown().optional(),
  missionStatement: z.unknown().optional(),
  MissionStatement: z.unknown().optional(),
  mission_statement: z.unknown().optional(),
});

const RawBusinessObjectSchema = z.object({
  Name: z.string().optional(),
  name: z.string().optional(),
  Code: RawScalarSchema,
  code: RawScalarSchema,
  Id: RawScalarSchema,
  id: RawScalarSchema,
  Status: z.string().optional(),
  status: z.string().optional(),
});

const PreparedRawReportSchema = z.object({
  templateName: z.string().optional(),
  header: RawHeaderSchema,
  businessObject: RawBusinessObjectSchema,
  table: z.object({
    columns: z.array(RawColumnSchema).min(1),
    rows: z.array(RawRowSchema),
  }),
});

export const ManualNormalizerStructuredReportRequestSchema = z.strictObject({
  data: z
    .array(PreparedRawReportSchema)
    .min(1)
    .max(PRODUCTION_MAX_REPORTS),
});

export const DiagnosticManualNormalizerStructuredReportRequestSchema =
  z.strictObject({
    data: z
      .array(PreparedRawReportSchema)
      .min(1)
      .max(DIAGNOSTIC_MAX_REPORTS),
  });
