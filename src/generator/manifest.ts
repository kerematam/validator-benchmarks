import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { z } from "zod";
import { structuredReportRequestSchemaForEnvelope } from "../contract/zod-schema";
import {
  getSyntheticProfile,
  SyntheticProfileNameSchema,
  type SyntheticProfileName,
} from "./profiles";

const CountRangeSchema = z.strictObject({
  total: z.number().int().nonnegative(),
  minimumPerReport: z.number().int().nonnegative(),
  maximumPerReport: z.number().int().nonnegative(),
});

const JsonStructuralCountsSchema = z.strictObject({
  objects: z.number().int().nonnegative(),
  arrays: z.number().int().nonnegative(),
  scalars: z.number().int().nonnegative(),
});

export const GeneratedProfileManifestSchema = z.strictObject({
  schemaVersion: z.literal(2),
  generator: z.literal("deterministic-synthetic-v1"),
  profile: SyntheticProfileNameSchema,
  validationEnvelope: z.enum(["production", "diagnostic"]),
  maximumReports: z.number().int().positive(),
  seed: z.number().int().min(0).max(0xffff_ffff),
  reportCount: z.number().int().positive(),
  columns: CountRangeSchema,
  rows: CountRangeSchema,
  cells: CountRangeSchema,
  jsonStructure: JsonStructuralCountsSchema,
  encodedBytes: z.number().int().positive(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
});

export type GeneratedProfileManifest = z.infer<
  typeof GeneratedProfileManifestSchema
>;

export interface ProfileTopologyCounts {
  readonly reportCount: number;
  readonly columns: Readonly<{
    total: number;
    minimumPerReport: number;
    maximumPerReport: number;
  }>;
  readonly rows: Readonly<{
    total: number;
    minimumPerReport: number;
    maximumPerReport: number;
  }>;
  readonly cells: Readonly<{
    total: number;
    minimumPerReport: number;
    maximumPerReport: number;
  }>;
}

export interface JsonStructuralCounts {
  readonly objects: number;
  readonly arrays: number;
  readonly scalars: number;
}

export function countJsonStructure(value: unknown): JsonStructuralCounts {
  let objects = 0;
  let arrays = 0;
  let scalars = 0;
  const pending: unknown[] = [value];

  while (pending.length > 0) {
    const current = pending.pop();
    if (Array.isArray(current)) {
      arrays += 1;
      pending.push(...current);
      continue;
    }

    if (typeof current === "object" && current !== null) {
      objects += 1;
      pending.push(...Object.values(current));
      continue;
    }

    scalars += 1;
  }

  return { objects, arrays, scalars };
}

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function createProfileManifest(
  profile: SyntheticProfileName,
  seed: number,
  request: unknown,
  json: string,
  topology: ProfileTopologyCounts,
): GeneratedProfileManifest {
  return GeneratedProfileManifestSchema.parse({
    schemaVersion: 2,
    generator: "deterministic-synthetic-v1",
    profile,
    validationEnvelope: getSyntheticProfile(profile).validationEnvelope,
    maximumReports: getSyntheticProfile(profile).maximumReports,
    seed,
    reportCount: topology.reportCount,
    columns: topology.columns,
    rows: topology.rows,
    cells: topology.cells,
    jsonStructure: countJsonStructure(request),
    encodedBytes: Buffer.byteLength(json, "utf8"),
    sha256: sha256(json),
  });
}

export function verifyProfileManifest(
  request: unknown,
  json: string,
  manifest: GeneratedProfileManifest,
): readonly string[] {
  const issues: string[] = [];
  const counts = countJsonStructure(request);

  if (Buffer.byteLength(json, "utf8") !== manifest.encodedBytes) {
    issues.push("encodedBytes");
  }
  if (sha256(json) !== manifest.sha256) {
    issues.push("sha256");
  }
  if (counts.objects !== manifest.jsonStructure.objects) {
    issues.push("jsonStructure.objects");
  }
  if (counts.arrays !== manifest.jsonStructure.arrays) {
    issues.push("jsonStructure.arrays");
  }
  if (counts.scalars !== manifest.jsonStructure.scalars) {
    issues.push("jsonStructure.scalars");
  }

  const expectedProfile = getSyntheticProfile(manifest.profile);
  if (manifest.validationEnvelope !== expectedProfile.validationEnvelope) {
    issues.push("validationEnvelope");
  }
  if (manifest.maximumReports !== expectedProfile.maximumReports) {
    issues.push("maximumReports");
  }

  const contractResult = structuredReportRequestSchemaForEnvelope(
    expectedProfile.validationEnvelope,
  ).safeParse(request);
  if (!contractResult.success) {
    issues.push("requestContract");
    return issues;
  }

  const reports = contractResult.data.data;
  const columnCounts = reports.map((report) => report.table.columns.length);
  const rowCounts = reports.map((report) => report.table.rows.length);
  const cellCounts = reports.map((report) =>
    report.table.rows.reduce(
      (reportTotal, row) =>
        reportTotal +
        Object.values(row).reduce(
          (rowTotal, cells) => rowTotal + cells.length,
          0,
        ),
      0,
    ),
  );
  if (
    reports.length !== manifest.reportCount ||
    reports.length !== expectedProfile.reportCount
  ) {
    issues.push("reportCount");
  }
  compareCountRange(columnCounts, manifest.columns, "columns", issues);
  compareCountRange(rowCounts, manifest.rows, "rows", issues);
  compareCountRange(cellCounts, manifest.cells, "cells", issues);

  return issues;
}

function compareCountRange(
  counts: readonly number[],
  expected: Readonly<{
    total: number;
    minimumPerReport: number;
    maximumPerReport: number;
  }>,
  field: string,
  issues: string[],
): void {
  const total = counts.reduce((sum, count) => sum + count, 0);
  const minimum = Math.min(...counts);
  const maximum = Math.max(...counts);

  if (total !== expected.total) {
    issues.push(`${field}.total`);
  }
  if (minimum !== expected.minimumPerReport) {
    issues.push(`${field}.minimumPerReport`);
  }
  if (maximum !== expected.maximumPerReport) {
    issues.push(`${field}.maximumPerReport`);
  }
}
