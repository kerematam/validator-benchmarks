import { describe, expect, test } from "bun:test";
import {
  auditSyntheticVocabulary,
  formatAuditPath,
} from "../src/privacy/synthetic-vocabulary";

describe("synthetic vocabulary audit", () => {
  test("accepts explicit artificial strings and audited stringified arrays", () => {
    const result = auditSyntheticVocabulary({
      data: [
        {
          syntheticReportNote: "SYNTHETIC-REPORT-NOTE-R000001-ABCDEFGH",
          header: {
            label: '["Synthetic Header Label R000001-ABCDEFGH",12,true,null]',
          },
          businessObject: { name: "Synthetic Object R000001-ABCDEFGH" },
          table: {
            columns: [{ key: "synthetic_column_01" }],
            rows: [],
          },
        },
      ],
    });

    expect(result.passed).toBeTrue();
    expect(result.issues).toEqual([]);
  });

  test("rejects values outside the artificial vocabulary without returning them", () => {
    const result = auditSyntheticVocabulary({
      data: [{ syntheticReportNote: "unapproved value" }],
    });

    expect(result.passed).toBeFalse();
    expect(result.issues).toEqual([
      {
        kind: "unexpected-string",
        path: ["data", 0, "syntheticReportNote"],
      },
    ]);
    expect(JSON.stringify(result)).not.toContain("unapproved value");
  });

  test("rejects unknown keys and reports only their structural path", () => {
    const result = auditSyntheticVocabulary({ data: [{ unsafeField: 1 }] });

    expect(result.passed).toBeFalse();
    expect(result.issues[0]?.kind).toBe("unexpected-key");
    expect(formatAuditPath(result.issues[0]?.path ?? [])).toBe(
      "$.data[0].unsafeField",
    );
  });
});
