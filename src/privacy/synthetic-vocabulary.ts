export type VocabularyAuditIssueKind =
  | "unexpected-key"
  | "unexpected-string"
  | "invalid-stringified-array";

export interface VocabularyAuditIssue {
  readonly kind: VocabularyAuditIssueKind;
  readonly path: readonly (string | number)[];
}

export interface VocabularyAuditResult {
  readonly passed: boolean;
  readonly keyCount: number;
  readonly stringCount: number;
  readonly issues: readonly VocabularyAuditIssue[];
}

const CONTRACT_KEYS = new Set([
  "data",
  "templateName",
  "header",
  "Header",
  "businessObject",
  "BusinessObject",
  "table",
  "Table",
  "columns",
  "rows",
  "key",
  "Key",
  "label",
  "Label",
  "value",
  "Value",
  "title",
  "Title",
  "subtitle",
  "Subtitle",
  "reportSubtitle",
  "ReportSubtitle",
  "timePeriod",
  "TimePeriod",
  "academicYear",
  "AcademicYear",
  "academic_year",
  "missionStatement",
  "MissionStatement",
  "mission_statement",
  "name",
  "Name",
  "code",
  "Code",
  "id",
  "Id",
  "status",
  "Status",
  "syntheticReportNote",
  "syntheticHeaderNote",
  "syntheticObjectNote",
  "syntheticTableNote",
  "syntheticColumnNote",
  "syntheticCellNote",
]);

const ALLOWED_STRING_PATTERNS = [
  /^Synthetic (?:Title|Alternate Title|Subtitle|Header Label|Header Value|Period|Mission|Object|Alternate Object|Column|Alternate Column|Cell|Alternate Cell) [A-Z0-9-]+$/u,
  /^SYNTHETIC-[A-Z0-9-]+$/u,
  /^synthetic-template-[0-9]{2}$/u,
  /^synthetic_column_(?:alias_)?[0-9]{2}$/u,
];

function isAllowedKey(key: string): boolean {
  return CONTRACT_KEYS.has(key) || /^synthetic_row_[0-9]{3}$/u.test(key);
}

function isAllowedPlainString(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return true;
  }

  return ALLOWED_STRING_PATTERNS.some((pattern) => pattern.test(trimmed));
}

interface PendingValue {
  readonly value: unknown;
  readonly path: readonly (string | number)[];
  readonly countString: boolean;
}

export function auditSyntheticVocabulary(value: unknown): VocabularyAuditResult {
  const issues: VocabularyAuditIssue[] = [];
  const pending: PendingValue[] = [{ value, path: [], countString: true }];
  let keyCount = 0;
  let stringCount = 0;

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) {
      continue;
    }

    if (typeof current.value === "string") {
      if (current.countString) {
        stringCount += 1;
      }

      const trimmed = current.value.trim();
      if (trimmed.startsWith("[") || trimmed.endsWith("]")) {
        try {
          const parsed: unknown = JSON.parse(trimmed);
          if (!Array.isArray(parsed)) {
            issues.push({ kind: "invalid-stringified-array", path: current.path });
          } else {
            pending.push({
              value: parsed,
              path: current.path,
              countString: false,
            });
          }
        } catch {
          issues.push({ kind: "invalid-stringified-array", path: current.path });
        }
      } else if (!isAllowedPlainString(current.value)) {
        issues.push({ kind: "unexpected-string", path: current.path });
      }
      continue;
    }

    if (Array.isArray(current.value)) {
      for (let index = 0; index < current.value.length; index += 1) {
        pending.push({
          value: current.value[index],
          path: [...current.path, index],
          countString: current.countString,
        });
      }
      continue;
    }

    if (typeof current.value === "object" && current.value !== null) {
      for (const [key, child] of Object.entries(current.value)) {
        keyCount += 1;
        if (!isAllowedKey(key)) {
          issues.push({
            kind: "unexpected-key",
            path: [...current.path, key],
          });
        }
        pending.push({
          value: child,
          path: [...current.path, key],
          countString: current.countString,
        });
      }
    }
  }

  return {
    passed: issues.length === 0,
    keyCount,
    stringCount,
    issues,
  };
}

export function formatAuditPath(path: readonly (string | number)[]): string {
  if (path.length === 0) {
    return "$";
  }

  return `$${path
    .map((part) => (typeof part === "number" ? `[${part}]` : `.${part}`))
    .join("")}`;
}
