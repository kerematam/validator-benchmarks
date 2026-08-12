import { beforeAll, describe, expect, test } from "bun:test";
import { createServer } from "node:net";
import { resolve } from "node:path";
import type { ValidatorAdapter } from "../src/contract/normalized-issue";
import {
  BENCHMARK_VALIDATION_PATH,
  createBenchmarkApp,
} from "../src/http/create-app";
import { ajvAdapter } from "../src/validators/ajv";
import { currentZodAdapter } from "../src/validators/current-zod";
import { currentZodManualNormalizerAdapter } from "../src/validators/current-zod-manual-normalizer";
import { loadCompiledZodAdapter } from "../src/validators/load-compiled-zod";
import { loadCompiledZodManualNormalizerAdapter } from "../src/validators/load-compiled-zod-manual-normalizer";
import { noValidationAdapter } from "../src/validators/none";
import { typeboxAdapter } from "../src/validators/typebox";
import { typeboxNativeTransformAdapter } from "../src/validators/typebox-native-transform";
import { valibotAdapter } from "../src/validators/valibot";
import { valibotNativeTransformAdapter } from "../src/validators/valibot-native-transform";

type PrototypeKeyBehavior =
  | "dropped"
  | "preserved-own-key"
  | "row-prototype-injected";

interface PrototypeKeyObservation {
  readonly behavior: PrototypeKeyBehavior;
  readonly inheritedCellLabel: string | undefined;
  readonly serializedRow: string;
}

interface PrototypeObjectObservation {
  readonly isAdmin: unknown;
  readonly keys: readonly string[];
  readonly ordinaryPrototype: boolean;
  readonly ownsPrototypeKey: boolean;
}

interface PrototypeObjectExpectedResult {
  readonly status: number;
  readonly validated: PrototypeObjectObservation | undefined;
}

interface PrototypeCellObservation {
  readonly isAdmin: unknown;
  readonly inheritedLength: unknown;
  readonly instanceOfArray: boolean;
  readonly inheritedCellLabel: string | undefined;
  readonly inheritedCellIsAdmin: unknown;
  readonly keys: readonly string[];
}

interface PrototypeCellExpectedResult {
  readonly status: number;
  readonly validated: PrototypeCellObservation | undefined;
}

let compiledZodAdapter: ValidatorAdapter | undefined;
let compiledZodManualNormalizerAdapter: ValidatorAdapter | undefined;
const PROTOTYPE_KEY_REQUEST_PATH = resolve(
  "test/fixtures/prototype-key-request.json",
);
const PROTOTYPE_OBJECT_REQUEST_PATH = resolve(
  "test/fixtures/prototype-object-request.json",
);
const PROTOTYPE_CELL_REQUEST_PATH = resolve(
  "test/fixtures/prototype-cell-request.json",
);

async function runBuild(script: string): Promise<void> {
  const build = Bun.spawn([Bun.argv[0] ?? "bun", "run", script], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    build.exited,
    new Response(build.stdout).text(),
    new Response(build.stderr).text(),
  ]);
  if (exitCode !== 0) {
    throw new Error(
      `${script} failed: ${stderr.trim() || stdout.trim()}`,
    );
  }
}

async function reserveLoopbackPort(): Promise<number> {
  const reservation = createServer();
  await new Promise<void>((resolveListening, rejectListening) => {
    reservation.once("error", rejectListening);
    reservation.listen(0, "127.0.0.1", resolveListening);
  });
  const address = reservation.address();
  if (address === null || typeof address === "string") {
    reservation.close();
    throw new Error("Failed to reserve a loopback port");
  }
  const port = address.port;
  await new Promise<void>((resolveClosed, rejectClosed) => {
    reservation.close((error) => {
      if (error) {
        rejectClosed(error);
      } else {
        resolveClosed();
      }
    });
  });
  return port;
}

beforeAll(async () => {
  await runBuild("build:compiled");
  await runBuild("build:compiled:manual-normalizer");

  compiledZodAdapter = await loadCompiledZodAdapter(
    resolve("dist/compiled-zod-external/compiled-zod-entry.js"),
  );
  compiledZodManualNormalizerAdapter =
    await loadCompiledZodManualNormalizerAdapter(
      resolve(
        "dist/compiled-zod-manual-normalizer/compiled-zod-manual-normalizer-entry.js",
      ),
    );
});

function adapters(): readonly ValidatorAdapter[] {
  if (
    compiledZodAdapter === undefined ||
    compiledZodManualNormalizerAdapter === undefined
  ) {
    throw new Error("Compiled adapters were not initialized");
  }

  return [
    currentZodAdapter,
    compiledZodAdapter,
    currentZodManualNormalizerAdapter,
    compiledZodManualNormalizerAdapter,
    ajvAdapter,
    typeboxAdapter,
    typeboxNativeTransformAdapter,
    valibotAdapter,
    valibotNativeTransformAdapter,
    noValidationAdapter,
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOnlyRow(value: unknown): Record<string, unknown> {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new Error("Expected a normalized request object");
  }
  const report = value.data[0];
  if (!isRecord(report) || !isRecord(report.table)) {
    throw new Error("Expected a normalized report table");
  }
  const rows = report.table.rows;
  if (!Array.isArray(rows) || !isRecord(rows[0])) {
    throw new Error("Expected a normalized row object");
  }
  return rows[0];
}

function readCellLabel(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  return typeof value.label === "string" ? value.label : undefined;
}

function observeRow(row: Record<string, unknown>): PrototypeKeyObservation {
  const ownsPrototypeKey = Object.hasOwn(row, "__proto__");
  const prototype = Object.getPrototypeOf(row);
  let behavior: PrototypeKeyBehavior;

  if (ownsPrototypeKey) {
    behavior = "preserved-own-key";
  } else if (Array.isArray(prototype)) {
    behavior = "row-prototype-injected";
  } else if (prototype === Object.prototype) {
    behavior = "dropped";
  } else {
    throw new Error("Observed an unexpected normalized-row prototype");
  }

  return {
    behavior,
    inheritedCellLabel: readCellLabel(row["0"]),
    serializedRow: JSON.stringify(row),
  };
}

function observePrototypeObjectRow(
  row: Record<string, unknown>,
): PrototypeObjectObservation {
  return {
    isAdmin: row["isAdmin"],
    keys: Object.keys(row),
    ordinaryPrototype: Object.getPrototypeOf(row) === Object.prototype,
    ownsPrototypeKey: Object.hasOwn(row, "__proto__"),
  };
}

function observePrototypeCellRow(
  row: Record<string, unknown>,
): PrototypeCellObservation {
  const inheritedCell = row["0"];
  return {
    isAdmin: row["isAdmin"],
    inheritedLength: row["length"],
    instanceOfArray: row instanceof Array,
    inheritedCellLabel: readCellLabel(inheritedCell),
    inheritedCellIsAdmin: isRecord(inheritedCell)
      ? inheritedCell["isAdmin"]
      : undefined,
    keys: Object.keys(row),
  };
}

const expectedBehavior: Readonly<
  Record<ValidatorAdapter["name"], PrototypeKeyObservation>
> = {
  "current-zod": {
    behavior: "dropped",
    inheritedCellLabel: undefined,
    serializedRow: "{}",
  },
  "compiled-zod": {
    behavior: "preserved-own-key",
    inheritedCellLabel: undefined,
    serializedRow:
      '{"__proto__":[{"label":"Synthetic Prototype Probe Cell","value":"SYNTHETIC-PROTOTYPE-PROBE-VALUE"}]}',
  },
  "zod-manual-normalizer": {
    behavior: "dropped",
    inheritedCellLabel: undefined,
    serializedRow: "{}",
  },
  "compiled-zod-manual-normalizer": {
    behavior: "dropped",
    inheritedCellLabel: undefined,
    serializedRow: "{}",
  },
  ajv: {
    behavior: "row-prototype-injected",
    inheritedCellLabel: "Synthetic Prototype Probe Cell",
    serializedRow: "{}",
  },
  typebox: {
    behavior: "row-prototype-injected",
    inheritedCellLabel: "Synthetic Prototype Probe Cell",
    serializedRow: "{}",
  },
  "typebox-native-transform": {
    behavior: "dropped",
    inheritedCellLabel: undefined,
    serializedRow: "{}",
  },
  valibot: {
    behavior: "row-prototype-injected",
    inheritedCellLabel: "Synthetic Prototype Probe Cell",
    serializedRow: "{}",
  },
  "valibot-native-transform": {
    behavior: "dropped",
    inheritedCellLabel: undefined,
    serializedRow: "{}",
  },
  none: {
    behavior: "preserved-own-key",
    inheritedCellLabel: undefined,
    serializedRow:
      '{"__proto__":[{"label":"Synthetic Prototype Probe Cell","value":"SYNTHETIC-PROTOTYPE-PROBE-VALUE"}]}',
  },
};

const droppedPrototypeObject: PrototypeObjectObservation = {
  isAdmin: undefined,
  keys: [],
  ordinaryPrototype: true,
  ownsPrototypeKey: false,
};

const preservedPrototypeObject: PrototypeObjectObservation = {
  isAdmin: undefined,
  keys: ["__proto__"],
  ordinaryPrototype: true,
  ownsPrototypeKey: true,
};

const expectedPrototypeObjectResult: Readonly<
  Record<ValidatorAdapter["name"], PrototypeObjectExpectedResult>
> = {
  "current-zod": { status: 200, validated: droppedPrototypeObject },
  "compiled-zod": { status: 400, validated: undefined },
  "zod-manual-normalizer": {
    status: 200,
    validated: droppedPrototypeObject,
  },
  "compiled-zod-manual-normalizer": {
    status: 400,
    validated: undefined,
  },
  ajv: { status: 400, validated: undefined },
  typebox: { status: 400, validated: undefined },
  "typebox-native-transform": { status: 400, validated: undefined },
  valibot: { status: 500, validated: undefined },
  "valibot-native-transform": {
    status: 200,
    validated: droppedPrototypeObject,
  },
  none: { status: 200, validated: preservedPrototypeObject },
};

const plainRowAfterCellPayload: PrototypeCellObservation = {
  isAdmin: undefined,
  inheritedLength: undefined,
  instanceOfArray: false,
  inheritedCellLabel: undefined,
  inheritedCellIsAdmin: undefined,
  keys: [],
};

const preservedOwnKeyAfterCellPayload: PrototypeCellObservation = {
  ...plainRowAfterCellPayload,
  keys: ["__proto__"],
};

const pollutedRowAfterCellPayload: PrototypeCellObservation = {
  isAdmin: undefined,
  inheritedLength: 1,
  instanceOfArray: true,
  inheritedCellLabel: "Synthetic Prototype Probe Cell",
  inheritedCellIsAdmin: undefined,
  keys: [],
};

const expectedPrototypeCellResult: Readonly<
  Record<ValidatorAdapter["name"], PrototypeCellExpectedResult>
> = {
  "current-zod": { status: 200, validated: plainRowAfterCellPayload },
  "compiled-zod": {
    status: 200,
    validated: preservedOwnKeyAfterCellPayload,
  },
  "zod-manual-normalizer": {
    status: 200,
    validated: plainRowAfterCellPayload,
  },
  "compiled-zod-manual-normalizer": {
    status: 200,
    validated: plainRowAfterCellPayload,
  },
  ajv: { status: 200, validated: pollutedRowAfterCellPayload },
  typebox: { status: 200, validated: pollutedRowAfterCellPayload },
  "typebox-native-transform": {
    status: 200,
    validated: plainRowAfterCellPayload,
  },
  valibot: { status: 200, validated: pollutedRowAfterCellPayload },
  "valibot-native-transform": {
    status: 200,
    validated: plainRowAfterCellPayload,
  },
  none: { status: 200, validated: preservedOwnKeyAfterCellPayload },
};

describe("isolated __proto__ row-key behavior", () => {
  test("sends raw JSON file bytes through Bun and Hono without client-side parsing", async () => {
    const globalPrototypeDescriptors = Object.getOwnPropertyDescriptors(
      Object.prototype,
    );
    const globalPrototypePrototype = Object.getPrototypeOf(Object.prototype);
    const parsedBodyObservation: PrototypeKeyObservation = {
      behavior: "preserved-own-key",
      inheritedCellLabel: undefined,
      serializedRow:
        '{"__proto__":[{"label":"Synthetic Prototype Probe Cell","value":"SYNTHETIC-PROTOTYPE-PROBE-VALUE"}]}',
    };

    for (const adapter of adapters()) {
      let observedAtParseBoundary: PrototypeKeyObservation | undefined;
      let observedAfterValidation: PrototypeKeyObservation | undefined;
      const app = createBenchmarkApp(adapter, {
        onParsed(value) {
          observedAtParseBoundary = observeRow(readOnlyRow(value));
        },
        onValidated(value) {
          observedAfterValidation = observeRow(readOnlyRow(value));
        },
      });
      const port = await reserveLoopbackPort();
      const server = Bun.serve({
        hostname: "127.0.0.1",
        port,
        fetch: app.fetch,
      });

      try {
        const response = await fetch(
          `http://127.0.0.1:${server.port}${BENCHMARK_VALIDATION_PATH}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: Bun.file(PROTOTYPE_KEY_REQUEST_PATH),
          },
        );

        expect(response.status, adapter.name).toBe(200);
        await response.arrayBuffer();
        expect(observedAtParseBoundary, adapter.name).toEqual(
          parsedBodyObservation,
        );
        expect(observedAfterValidation, adapter.name).toEqual(
          expectedBehavior[adapter.name],
        );
        expect(
          Object.getOwnPropertyDescriptors(Object.prototype),
          `${adapter.name} must not pollute global Object.prototype`,
        ).toEqual(globalPrototypeDescriptors);
        expect(
          Object.getPrototypeOf(Object.prototype),
          `${adapter.name} must not change Object.prototype's prototype`,
        ).toBe(globalPrototypePrototype);
      } finally {
        server.stop(true);
      }
    }
  });

  test("does not inherit isAdmin from a raw __proto__ object request", async () => {
    const parsedBodyObservation: PrototypeObjectObservation = {
      isAdmin: undefined,
      keys: ["__proto__"],
      ordinaryPrototype: true,
      ownsPrototypeKey: true,
    };
    const globalPrototypeDescriptors = Object.getOwnPropertyDescriptors(
      Object.prototype,
    );
    const globalPrototypePrototype = Object.getPrototypeOf(Object.prototype);

    for (const adapter of adapters()) {
      let observedAtParseBoundary: PrototypeObjectObservation | undefined;
      let observedAfterValidation: PrototypeObjectObservation | undefined;
      const app = createBenchmarkApp(adapter, {
        onParsed(value) {
          observedAtParseBoundary = observePrototypeObjectRow(
            readOnlyRow(value),
          );
        },
        onValidated(value) {
          observedAfterValidation = observePrototypeObjectRow(
            readOnlyRow(value),
          );
        },
      });
      const port = await reserveLoopbackPort();
      const server = Bun.serve({
        hostname: "127.0.0.1",
        port,
        fetch: app.fetch,
      });

      try {
        const response = await fetch(
          `http://127.0.0.1:${server.port}${BENCHMARK_VALIDATION_PATH}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: Bun.file(PROTOTYPE_OBJECT_REQUEST_PATH),
          },
        );

        expect(response.status, adapter.name).toBe(
          expectedPrototypeObjectResult[adapter.name].status,
        );
        await response.arrayBuffer();
        expect(observedAtParseBoundary, adapter.name).toEqual(
          parsedBodyObservation,
        );
        expect(observedAfterValidation, adapter.name).toEqual(
          expectedPrototypeObjectResult[adapter.name].validated,
        );
        expect(
          Object.getOwnPropertyDescriptors(Object.prototype),
          `${adapter.name} must not pollute global Object.prototype`,
        ).toEqual(globalPrototypeDescriptors);
        expect(
          Object.getPrototypeOf(Object.prototype),
          `${adapter.name} must not change Object.prototype's prototype`,
        ).toBe(globalPrototypePrototype);
      } finally {
        server.stop(true);
      }
    }
  });

  test("pollutes the row prototype with a schema-valid cell array but cannot set isAdmin", async () => {
    const parsedBodyObservation: PrototypeCellObservation = {
      isAdmin: undefined,
      inheritedLength: undefined,
      instanceOfArray: false,
      inheritedCellLabel: undefined,
      inheritedCellIsAdmin: undefined,
      keys: ["__proto__"],
    };
    const globalPrototypeDescriptors = Object.getOwnPropertyDescriptors(
      Object.prototype,
    );
    const globalPrototypePrototype = Object.getPrototypeOf(Object.prototype);

    for (const adapter of adapters()) {
      let observedAtParseBoundary: PrototypeCellObservation | undefined;
      let observedAfterValidation: PrototypeCellObservation | undefined;
      const app = createBenchmarkApp(adapter, {
        onParsed(value) {
          observedAtParseBoundary = observePrototypeCellRow(
            readOnlyRow(value),
          );
        },
        onValidated(value) {
          observedAfterValidation = observePrototypeCellRow(
            readOnlyRow(value),
          );
        },
      });
      const port = await reserveLoopbackPort();
      const server = Bun.serve({
        hostname: "127.0.0.1",
        port,
        fetch: app.fetch,
      });

      try {
        const response = await fetch(
          `http://127.0.0.1:${server.port}${BENCHMARK_VALIDATION_PATH}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: Bun.file(PROTOTYPE_CELL_REQUEST_PATH),
          },
        );

        expect(response.status, adapter.name).toBe(
          expectedPrototypeCellResult[adapter.name].status,
        );
        await response.arrayBuffer();
        expect(observedAtParseBoundary, adapter.name).toEqual(
          parsedBodyObservation,
        );
        expect(observedAfterValidation, adapter.name).toEqual(
          expectedPrototypeCellResult[adapter.name].validated,
        );
        expect(
          Object.getOwnPropertyDescriptors(Object.prototype),
          `${adapter.name} must not pollute global Object.prototype`,
        ).toEqual(globalPrototypeDescriptors);
        expect(
          Object.getPrototypeOf(Object.prototype),
          `${adapter.name} must not change Object.prototype's prototype`,
        ).toBe(globalPrototypePrototype);
      } finally {
        server.stop(true);
      }
    }
  });
});
