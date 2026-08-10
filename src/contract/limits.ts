export const PRODUCTION_MAX_REPORTS = 2_000;
export const DIAGNOSTIC_MAX_REPORTS = 10_000;

export type ValidationEnvelope = "production" | "diagnostic";

export function maximumReportsForEnvelope(
  envelope: ValidationEnvelope,
): number {
  return envelope === "production"
    ? PRODUCTION_MAX_REPORTS
    : DIAGNOSTIC_MAX_REPORTS;
}
