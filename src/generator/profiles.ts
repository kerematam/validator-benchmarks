import { z } from "zod";
import {
  DIAGNOSTIC_MAX_REPORTS,
  PRODUCTION_MAX_REPORTS,
  type ValidationEnvelope,
} from "../contract/limits";

export const SyntheticProfileNameSchema = z.enum([
  "smoke",
  "small",
  "diagnostic-10000",
]);
export type SyntheticProfileName = z.infer<
  typeof SyntheticProfileNameSchema
>;

export interface SyntheticProfileDefinition {
  readonly name: SyntheticProfileName;
  readonly reportCount: number;
  readonly validationEnvelope: ValidationEnvelope;
  readonly maximumReports: number;
  readonly description: string;
  readonly columnsPerReport: Readonly<{ minimum: number; maximum: number }>;
  readonly rowsPerReport: Readonly<{ minimum: number; maximum: number }>;
}

const SMOKE_PROFILE: SyntheticProfileDefinition = {
  name: "smoke",
  reportCount: 1,
  validationEnvelope: "production",
  maximumReports: PRODUCTION_MAX_REPORTS,
  description: "One hand-auditable report for correctness and CI checks.",
  columnsPerReport: { minimum: 3, maximum: 3 },
  rowsPerReport: { minimum: 2, maximum: 2 },
};

const SMALL_PROFILE: SyntheticProfileDefinition = {
  name: "small",
  reportCount: 100,
  validationEnvelope: "production",
  maximumReports: PRODUCTION_MAX_REPORTS,
  description: "Fast local corpus with deterministic topology variation.",
  columnsPerReport: { minimum: 3, maximum: 6 },
  rowsPerReport: { minimum: 2, maximum: 5 },
};

const DIAGNOSTIC_10000_PROFILE: SyntheticProfileDefinition = {
  name: "diagnostic-10000",
  reportCount: DIAGNOSTIC_MAX_REPORTS,
  validationEnvelope: "diagnostic",
  maximumReports: DIAGNOSTIC_MAX_REPORTS,
  description:
    "Benchmark-only amplified signal; not a supported production request.",
  columnsPerReport: { minimum: 3, maximum: 6 },
  rowsPerReport: { minimum: 2, maximum: 5 },
};

export function getSyntheticProfile(
  profile: SyntheticProfileName,
): SyntheticProfileDefinition {
  switch (profile) {
    case "smoke":
      return SMOKE_PROFILE;
    case "small":
      return SMALL_PROFILE;
    case "diagnostic-10000":
      return DIAGNOSTIC_10000_PROFILE;
  }
}

export function columnCountForReport(
  profile: SyntheticProfileDefinition,
  reportIndex: number,
): number {
  const span =
    profile.columnsPerReport.maximum - profile.columnsPerReport.minimum + 1;
  return profile.columnsPerReport.minimum + (reportIndex % span);
}

export function rowCountForReport(
  profile: SyntheticProfileDefinition,
  reportIndex: number,
): number {
  const span = profile.rowsPerReport.maximum - profile.rowsPerReport.minimum + 1;
  return profile.rowsPerReport.minimum + (reportIndex % span);
}
