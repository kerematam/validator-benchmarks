import {
  DIAGNOSTIC_MAX_REPORTS,
  PRODUCTION_MAX_REPORTS,
} from "./limits";

const scalarSchema = {
  type: ["string", "number", "boolean", "null"],
};

function createStructuredReportJsonSchema(
  maximumReports: number,
  schemaName: string,
): object {
  return {
    $id: `https://synthetic.invalid/${schemaName}.schema.json`,
    type: "object",
    additionalProperties: false,
    required: ["data"],
    properties: {
      data: {
        type: "array",
        minItems: 1,
        maxItems: maximumReports,
        items: { $ref: "#/$defs/report" },
      },
    },
    $defs: {
      cell: {
        type: "object",
        additionalProperties: true,
        properties: {
          label: { type: "string" },
          Label: { type: "string" },
          value: scalarSchema,
          Value: scalarSchema,
        },
      },
      column: {
        type: "object",
        additionalProperties: true,
        properties: {
          key: { type: "string" },
          Key: { type: "string" },
          header: { type: "string" },
          Header: { type: "string" },
        },
      },
      row: {
        type: "object",
        additionalProperties: {
          type: "array",
          items: { $ref: "#/$defs/cell" },
        },
      },
      table: {
        type: "object",
        additionalProperties: true,
        required: ["columns", "rows"],
        properties: {
          columns: {
            type: "array",
            minItems: 1,
            items: { $ref: "#/$defs/column" },
          },
          rows: {
            type: "array",
            items: { $ref: "#/$defs/row" },
          },
        },
      },
      businessObject: {
        type: "object",
        additionalProperties: true,
        properties: {
          Name: { type: "string" },
          name: { type: "string" },
          Code: scalarSchema,
          code: scalarSchema,
          Id: scalarSchema,
          id: scalarSchema,
          Status: { type: "string" },
          status: { type: "string" },
        },
      },
      header: {
        type: "object",
        additionalProperties: true,
      },
      report: {
        type: "object",
        additionalProperties: true,
        required: ["header", "businessObject", "table"],
        properties: {
          templateName: { type: "string" },
          header: { $ref: "#/$defs/header" },
          businessObject: { $ref: "#/$defs/businessObject" },
          table: { $ref: "#/$defs/table" },
        },
      },
    },
  };
}

export const STRUCTURED_REPORT_JSON_SCHEMA = createStructuredReportJsonSchema(
  PRODUCTION_MAX_REPORTS,
  "structured-report-request",
);

export const DIAGNOSTIC_STRUCTURED_REPORT_JSON_SCHEMA =
  createStructuredReportJsonSchema(
    DIAGNOSTIC_MAX_REPORTS,
    "diagnostic-structured-report-request",
  );
