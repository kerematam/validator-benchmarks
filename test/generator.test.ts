import { describe, expect, test } from "bun:test";
import { structuredReportRequestSchemaForEnvelope } from "../src/contract/zod-schema";
import { generateSyntheticProfile } from "../src/generator/generate";
import {
  GeneratedProfileManifestSchema,
  verifyProfileManifest,
} from "../src/generator/manifest";
import {
  getSyntheticProfile,
  type SyntheticProfileName,
} from "../src/generator/profiles";
import { auditSyntheticVocabulary } from "../src/privacy/synthetic-vocabulary";

const PROFILE_NAMES: readonly SyntheticProfileName[] = [
  "smoke",
  "small",
  "diagnostic-10000",
];

describe("deterministic synthetic profiles", () => {
  for (const profileName of PROFILE_NAMES) {
    test(
      `${profileName} is byte-identical for the same seed`,
      () => {
        const first = generateSyntheticProfile(profileName, 20_260_807);
        const second = generateSyntheticProfile(profileName, 20_260_807);

        expect(second.json).toBe(first.json);
        expect(second.manifest).toEqual(first.manifest);
      },
      profileName === "diagnostic-10000" ? 120_000 : 5_000,
    );

    test(
      `${profileName} passes the current-Zod, manifest, and vocabulary gates`,
      () => {
        const generated = generateSyntheticProfile(profileName, 20_260_807);
        const profile = getSyntheticProfile(profileName);
        const contractResult = structuredReportRequestSchemaForEnvelope(
          profile.validationEnvelope,
        ).safeParse(generated.request);
        if (!contractResult.success) {
          throw new Error("Expected generated input to satisfy the contract");
        }

        expect(
          GeneratedProfileManifestSchema.safeParse(generated.manifest).success,
        ).toBeTrue();
        expect(
          verifyProfileManifest(
            generated.request,
            generated.json,
            generated.manifest,
          ),
        ).toEqual([]);
        expect(auditSyntheticVocabulary(generated.request).passed).toBeTrue();

        const columnCounts = contractResult.data.data.map(
          (report) => report.table.columns.length,
        );
        const rowCounts = contractResult.data.data.map(
          (report) => report.table.rows.length,
        );
        const cellCounts = contractResult.data.data.map((report) =>
          report.table.rows.reduce(
            (total, row) =>
              total +
              Object.values(row).reduce(
                (rowTotal, cells) => rowTotal + cells.length,
                0,
              ),
            0,
          ),
        );

        expect(generated.manifest.reportCount).toBe(
          contractResult.data.data.length,
        );
        expect(generated.manifest.columns).toEqual({
          total: columnCounts.reduce((total, count) => total + count, 0),
          minimumPerReport: Math.min(...columnCounts),
          maximumPerReport: Math.max(...columnCounts),
        });
        expect(generated.manifest.rows).toEqual({
          total: rowCounts.reduce((total, count) => total + count, 0),
          minimumPerReport: Math.min(...rowCounts),
          maximumPerReport: Math.max(...rowCounts),
        });
        expect(generated.manifest.cells).toEqual({
          total: cellCounts.reduce((total, count) => total + count, 0),
          minimumPerReport: Math.min(...cellCounts),
          maximumPerReport: Math.max(...cellCounts),
        });
      },
      profileName === "diagnostic-10000" ? 120_000 : 5_000,
    );
  }

  test("different seeds change only values and derived byte identity", () => {
    const first = generateSyntheticProfile("small", 1);
    const second = generateSyntheticProfile("small", 2);

    expect(second.json).not.toBe(first.json);
    expect(second.manifest.sha256).not.toBe(first.manifest.sha256);
    expect(second.manifest.reportCount).toBe(first.manifest.reportCount);
    expect(second.manifest.columns).toEqual(first.manifest.columns);
    expect(second.manifest.rows).toEqual(first.manifest.rows);
    expect(second.manifest.cells).toEqual(first.manifest.cells);
    expect(second.manifest.jsonStructure).toEqual(
      first.manifest.jsonStructure,
    );
    expect(second.manifest.encodedBytes).toBe(first.manifest.encodedBytes);
  });

  test("small covers lowercase, PascalCase, mixed aliases, and scalar kinds", () => {
    const generated = generateSyntheticProfile("small", 20_260_807);
    const parsed: unknown = JSON.parse(generated.json);
    const pending: unknown[] = [parsed];
    const keys = new Set<string>();
    const scalarKinds = new Set<string>();

    while (pending.length > 0) {
      const current = pending.pop();
      if (Array.isArray(current)) {
        pending.push(...current);
      } else if (typeof current === "object" && current !== null) {
        for (const [key, value] of Object.entries(current)) {
          keys.add(key);
          if (key === "value" || key === "Value" || key === "code" || key === "Code") {
            scalarKinds.add(value === null ? "null" : typeof value);
          }
          pending.push(value);
        }
      }
    }

    expect([...keys]).toEqual(
      expect.arrayContaining([
        "header",
        "Header",
        "businessObject",
        "BusinessObject",
        "table",
        "Table",
        "key",
        "Key",
        "label",
        "Label",
        "value",
        "Value",
      ]),
    );
    expect(scalarKinds).toEqual(
      new Set(["string", "number", "boolean", "null"]),
    );
  });

  test("manifest verification detects changed bytes without exposing content", () => {
    const generated = generateSyntheticProfile("smoke", 20_260_807);
    expect(
      verifyProfileManifest(
        generated.request,
        `${generated.json} `,
        generated.manifest,
      ),
    ).toEqual(["encodedBytes", "sha256"]);
  });

  test("manifest verification recomputes declared topology", () => {
    const generated = generateSyntheticProfile("smoke", 20_260_807);
    const changedManifest = {
      ...generated.manifest,
      rows: {
        ...generated.manifest.rows,
        total: generated.manifest.rows.total + 1,
      },
    };

    expect(
      verifyProfileManifest(
        generated.request,
        generated.json,
        changedManifest,
      ),
    ).toEqual(["rows.total"]);
  });
});
