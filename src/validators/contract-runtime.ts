import type {
  NormalizedIssue,
  NormalizedIssueCategory,
  NormalizedIssuePathSegment,
} from "../contract/normalized-issue";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickNullish(
  source: Record<string, unknown>,
  keys: readonly string[],
): unknown {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
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
    if (parsed) {
      return normalizeOptionalHeaderText(parsed);
    }
  }

  return text;
}

function pickOptionalHeaderText(
  source: Record<string, unknown>,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const text = normalizeOptionalHeaderText(source[key]);
    if (text) {
      return text;
    }
  }

  return undefined;
}

function requireText(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

function normalizeHeader(source: Record<string, unknown>): Record<string, unknown> {
  return {
    title: pickOptionalText(source, ["title", "Title"]),
    subtitle: pickOptionalText(source, [
      "subtitle",
      "Subtitle",
      "reportSubtitle",
      "ReportSubtitle",
    ]),
    label: pickOptionalHeaderText(source, ["label", "Label"]),
    value: pickOptionalHeaderText(source, ["value", "Value"]),
    timePeriod: pickOptionalText(source, [
      "timePeriod",
      "TimePeriod",
      "academicYear",
      "AcademicYear",
      "academic_year",
    ]),
    missionStatement: pickOptionalText(source, [
      "missionStatement",
      "MissionStatement",
      "mission_statement",
    ]),
  };
}

function refinementIssue(
  category: NormalizedIssueCategory,
  path: readonly NormalizedIssuePathSegment[],
): NormalizedIssue {
  return { category, path };
}

function normalizeRequiredText(
  value: string,
  path: readonly NormalizedIssuePathSegment[],
  issues: NormalizedIssue[],
): string {
  const normalized = value.trim();
  if (!normalized) {
    issues.push(refinementIssue("too_small", path));
  }
  return normalized;
}

function normalizeBusinessObject(
  source: Record<string, unknown>,
  path: readonly NormalizedIssuePathSegment[],
  issues: NormalizedIssue[],
): Record<string, unknown> {
  const name = pickNullish(source, ["Name", "name"]);
  return {
    name: normalizeRequiredText(
      typeof name === "string" ? name : "",
      [...path, "name"],
      issues,
    ),
    code: pickOptionalText(source, ["Code", "code"]),
    id: pickOptionalText(source, ["Id", "id"]),
    status: pickOptionalText(source, ["Status", "status"]),
  };
}

function normalizeColumn(
  source: Record<string, unknown>,
  path: readonly NormalizedIssuePathSegment[],
  issues: NormalizedIssue[],
): Record<string, unknown> {
  const rawKey = pickNullish(source, ["key", "Key"]);
  const key = normalizeRequiredText(
    typeof rawKey === "string" ? rawKey : "",
    [...path, "key"],
    issues,
  );
  const rawHeader = pickNullish(source, ["header", "Header"]);
  const header = typeof rawHeader === "string" ? rawHeader.trim() : key;
  return { key, header };
}

function normalizeCell(
  source: Record<string, unknown>,
  path: readonly NormalizedIssuePathSegment[],
  issues: NormalizedIssue[],
): Record<string, unknown> {
  const rawLabel = pickNullish(source, ["label", "Label"]);
  return {
    label: normalizeRequiredText(
      typeof rawLabel === "string" ? rawLabel : "",
      [...path, "label"],
      issues,
    ),
    value: requireText(pickNullish(source, ["value", "Value"])),
  };
}

function normalizeTable(
  source: Record<string, unknown>,
  path: readonly NormalizedIssuePathSegment[],
  issues: NormalizedIssue[],
): Record<string, unknown> {
  const columns = source.columns;
  const rows = source.rows;
  if (!Array.isArray(columns) || !Array.isArray(rows)) {
    throw new Error("Validator accepted a table with invalid containers");
  }

  return {
    columns: columns.map((column, columnIndex) => {
      if (!isRecord(column)) {
        throw new Error("Validator accepted an invalid column");
      }
      return normalizeColumn(
        column,
        [...path, "columns", columnIndex],
        issues,
      );
    }),
    rows: rows.map((row, rowIndex) => {
      if (!isRecord(row)) {
        throw new Error("Validator accepted an invalid row");
      }

      const normalizedRow: Record<string, unknown> = {};
      for (const [key, cells] of Object.entries(row)) {
        if (!Array.isArray(cells)) {
          throw new Error("Validator accepted an invalid cell collection");
        }
        normalizedRow[key] = cells.map((cell, cellIndex) => {
          if (!isRecord(cell)) {
            throw new Error("Validator accepted an invalid cell");
          }
          return normalizeCell(
            cell,
            [...path, "rows", rowIndex, key, cellIndex],
            issues,
          );
        });
      }
      return normalizedRow;
    }),
  };
}

function normalizeReport(
  source: Record<string, unknown>,
  path: readonly NormalizedIssuePathSegment[],
  issues: NormalizedIssue[],
): Record<string, unknown> {
  const header = pickNullish(source, ["header", "Header"]);
  const businessObject = pickNullish(source, [
    "businessObject",
    "BusinessObject",
  ]);
  const table = pickNullish(source, ["table", "Table"]);
  if (!isRecord(header) || !isRecord(businessObject) || !isRecord(table)) {
    throw new Error("Validator normalization received an incomplete report");
  }

  const normalized: Record<string, unknown> = {
    header: normalizeHeader(header),
    businessObject: normalizeBusinessObject(
      businessObject,
      [...path, "businessObject"],
      issues,
    ),
    table: normalizeTable(table, [...path, "table"], issues),
  };
  const templateName = source.templateName;
  normalized.templateName =
    typeof templateName === "string"
      ? templateName.trim() || undefined
      : undefined;
  return normalized;
}

function prepareReport(source: Record<string, unknown>): Record<string, unknown> {
  return {
    templateName: source.templateName,
    header: pickNullish(source, ["header", "Header"]) ?? {},
    businessObject: pickNullish(source, [
      "businessObject",
      "BusinessObject",
    ]),
    table: pickNullish(source, ["table", "Table"]),
  };
}

export function prepareRequestInPlace(input: unknown): unknown {
  if (!isRecord(input) || !Array.isArray(input.data)) {
    return input;
  }

  for (let index = 0; index < input.data.length; index += 1) {
    const report = input.data[index];
    if (isRecord(report)) {
      input.data[index] = prepareReport(report);
    }
  }

  return input;
}

export interface NormalizationResult {
  readonly data: unknown;
  readonly issues: readonly NormalizedIssue[];
}

export function normalizeRequestInPlace(input: unknown): NormalizationResult {
  if (!isRecord(input) || !Array.isArray(input.data)) {
    throw new Error("Validator normalization received an invalid request");
  }

  const issues: NormalizedIssue[] = [];
  for (let index = 0; index < input.data.length; index += 1) {
    const report = input.data[index];
    if (!isRecord(report)) {
      throw new Error("Validator accepted an invalid report");
    }
    input.data[index] = normalizeReport(report, ["data", index], issues);
  }

  return { data: input, issues };
}
