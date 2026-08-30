import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import Ajv from "ajv";
import Type from "typebox";
import Schema from "typebox/schema";
import * as v from "valibot";
import { z } from "zod";
import { z as z44 } from "zod-4-4";
import {
  SimpleRecordSchema,
  SimpleStrictRecordSchema,
} from "../src/contract/simple-zod-schema";

interface SchemaOnlyObservation {
  readonly accepted: boolean;
  readonly isAdmin: unknown;
  readonly ownsPrototypeKey: boolean;
  readonly ordinaryPrototype: boolean;
  readonly prototypeIsAdmin: unknown;
  readonly controlLabel: unknown;
  readonly keys: readonly string[];
}

type SchemaOnlyCaseName =
  | "zod-4.4-interpreted"
  | "zod-4.5-interpreted"
  | "zod-4.5-compiled"
  | "ajv"
  | "typebox"
  | "valibot";

interface SchemaOnlyCase {
  readonly name: SchemaOnlyCaseName;
  readonly run: (input: unknown) => SchemaOnlyObservation;
}

const FIXTURE_PATH = resolve(
  "test/fixtures/prototype-schema-only-request.json",
);
const LABEL_FIXTURE_PATH = resolve(
  "test/fixtures/prototype-schema-only-label-request.json",
);
const SIMPLE_AJV_SCHEMA = {
  type: "object",
  additionalProperties: {
    type: "object",
    additionalProperties: true,
    properties: {
      label: { type: "string" },
    },
  },
} as const;

const SIMPLE_TYPEBOX_SCHEMA = Type.Record(
  Type.String(),
  Type.Object(
    { label: Type.Optional(Type.String()) },
    { additionalProperties: true },
  ),
);

const SIMPLE_VALIBOT_SCHEMA = v.record(
  v.string(),
  v.looseObject({ label: v.optional(v.string()) }),
);

const STRICT_AJV_SCHEMA = {
  type: "object",
  additionalProperties: {
    type: "object",
    additionalProperties: false,
    properties: {
      label: { type: "string" },
    },
  },
} as const;

const STRICT_TYPEBOX_SCHEMA = Type.Record(
  Type.String(),
  Type.Object(
    { label: Type.Optional(Type.String()) },
    { additionalProperties: false },
  ),
);

const STRICT_VALIBOT_SCHEMA = v.record(
  v.string(),
  v.object({ label: v.optional(v.string()) }),
);

interface StrictEntryObservation {
  readonly accepted: boolean;
  readonly ownsPrototypeKey: boolean;
  readonly protoValueIsAdmin: unknown;
  readonly isAdmin: unknown;
  readonly ordinaryPrototype: boolean;
  readonly controlLabel: unknown;
  readonly keys: readonly string[];
}

interface StrictEntryCase {
  readonly name: SchemaOnlyCaseName;
  readonly run: (input: unknown) => StrictEntryObservation;
}

const zod44SimpleRecordSchema = z44.record(
  z44.string(),
  z44.looseObject({ label: z44.string().optional() }),
);
const zod44SimpleStrictRecordSchema = z44.record(
  z44.string(),
  z44.object({ label: z44.string().optional() }),
);
const nativeCompiledSimpleSchema = z.compile(SimpleRecordSchema, {
  strict: true,
});
const nativeCompiledSimpleStrictSchema = z.compile(
  SimpleStrictRecordSchema,
  { strict: true },
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function observeOutput(
  accepted: boolean,
  output: unknown,
): SchemaOnlyObservation {
  if (!accepted) {
    return {
      accepted: false,
      isAdmin: undefined,
      ownsPrototypeKey: false,
      ordinaryPrototype: false,
      prototypeIsAdmin: undefined,
      controlLabel: undefined,
      keys: [],
    };
  }
  if (!isRecord(output)) {
    throw new Error("Validator accepted but produced a non-object output");
  }

  const prototype: unknown = Object.getPrototypeOf(output);
  const control = output.control;
  return {
    accepted: true,
    isAdmin: output.isAdmin,
    ownsPrototypeKey: Object.hasOwn(output, "__proto__"),
    ordinaryPrototype: prototype === Object.prototype,
    prototypeIsAdmin: isRecord(prototype) ? prototype.isAdmin : undefined,
    controlLabel: isRecord(control) ? control.label : undefined,
    keys: Object.keys(output),
  };
}

function cases(): readonly SchemaOnlyCase[] {
  const ajvValidate = new Ajv({
    allErrors: true,
    allowUnionTypes: true,
    strict: true,
  }).compile<unknown>(SIMPLE_AJV_SCHEMA);
  const typeboxValidator = Schema.Compile(SIMPLE_TYPEBOX_SCHEMA);

  return [
    {
      name: "zod-4.4-interpreted",
      run(input) {
        const result = zod44SimpleRecordSchema.safeParse(input);
        return observeOutput(
          result.success,
          result.success ? result.data : undefined,
        );
      },
    },
    {
      name: "zod-4.5-interpreted",
      run(input) {
        const result = SimpleRecordSchema.safeParse(input);
        return observeOutput(
          result.success,
          result.success ? result.data : undefined,
        );
      },
    },
    {
      name: "zod-4.5-compiled",
      run(input) {
        const result = nativeCompiledSimpleSchema.safeParse(input);
        return observeOutput(
          result.success,
          result.success ? result.data : undefined,
        );
      },
    },
    {
      name: "ajv",
      run(input) {
        return observeOutput(ajvValidate(input), input);
      },
    },
    {
      name: "typebox",
      run(input) {
        return observeOutput(typeboxValidator.Check(input), input);
      },
    },
    {
      name: "valibot",
      run(input) {
        const result = v.safeParse(SIMPLE_VALIBOT_SCHEMA, input);
        return observeOutput(
          result.success,
          result.success ? result.output : undefined,
        );
      },
    },
  ];
}

const droppedBySchema: SchemaOnlyObservation = {
  accepted: true,
  isAdmin: undefined,
  ownsPrototypeKey: false,
  ordinaryPrototype: true,
  prototypeIsAdmin: undefined,
  controlLabel: "synthetic-control-entry",
  keys: ["control"],
};

const preservedOwnKeyBySchema: SchemaOnlyObservation = {
  ...droppedBySchema,
  ownsPrototypeKey: true,
  keys: ["control", "__proto__"],
};

const expectedObservations: Readonly<
  Record<SchemaOnlyCaseName, SchemaOnlyObservation>
> = {
  "zod-4.4-interpreted": droppedBySchema,
  "zod-4.5-interpreted": droppedBySchema,
  "zod-4.5-compiled": droppedBySchema,
  ajv: preservedOwnKeyBySchema,
  typebox: preservedOwnKeyBySchema,
  valibot: droppedBySchema,
};

function observeStrictOutput(
  accepted: boolean,
  output: unknown,
): StrictEntryObservation {
  if (!accepted) {
    return {
      accepted: false,
      ownsPrototypeKey: false,
      protoValueIsAdmin: undefined,
      isAdmin: undefined,
      ordinaryPrototype: false,
      controlLabel: undefined,
      keys: [],
    };
  }
  if (!isRecord(output)) {
    throw new Error("Validator accepted but produced a non-object output");
  }

  const protoSlot: unknown = output["__proto__"];
  const prototype: unknown = Object.getPrototypeOf(output);
  const control = output.control;
  return {
    accepted: true,
    ownsPrototypeKey: Object.hasOwn(output, "__proto__"),
    protoValueIsAdmin: isRecord(protoSlot) ? protoSlot.isAdmin : undefined,
    isAdmin: output.isAdmin,
    ordinaryPrototype: prototype === Object.prototype,
    controlLabel: isRecord(control) ? control.label : undefined,
    keys: Object.keys(output),
  };
}

function strictCases(): readonly StrictEntryCase[] {
  const ajvValidate = new Ajv({
    allErrors: true,
    allowUnionTypes: true,
    strict: true,
  }).compile<unknown>(STRICT_AJV_SCHEMA);
  const typeboxValidator = Schema.Compile(STRICT_TYPEBOX_SCHEMA);

  return [
    {
      name: "zod-4.4-interpreted",
      run(input) {
        const result = zod44SimpleStrictRecordSchema.safeParse(input);
        return observeStrictOutput(
          result.success,
          result.success ? result.data : undefined,
        );
      },
    },
    {
      name: "zod-4.5-interpreted",
      run(input) {
        const result = SimpleStrictRecordSchema.safeParse(input);
        return observeStrictOutput(
          result.success,
          result.success ? result.data : undefined,
        );
      },
    },
    {
      name: "zod-4.5-compiled",
      run(input) {
        const result = nativeCompiledSimpleStrictSchema.safeParse(input);
        return observeStrictOutput(
          result.success,
          result.success ? result.data : undefined,
        );
      },
    },
    {
      name: "ajv",
      run(input) {
        return observeStrictOutput(ajvValidate(input), input);
      },
    },
    {
      name: "typebox",
      run(input) {
        return observeStrictOutput(typeboxValidator.Check(input), input);
      },
    },
    {
      name: "valibot",
      run(input) {
        const result = v.safeParse(STRICT_VALIBOT_SCHEMA, input);
        return observeStrictOutput(
          result.success,
          result.success ? result.output : undefined,
        );
      },
    },
  ];
}

const rejectedByStrictEntry: StrictEntryObservation = {
  accepted: false,
  ownsPrototypeKey: false,
  protoValueIsAdmin: undefined,
  isAdmin: undefined,
  ordinaryPrototype: false,
  controlLabel: undefined,
  keys: [],
};

const strippedAndDropped: StrictEntryObservation = {
  accepted: true,
  ownsPrototypeKey: false,
  protoValueIsAdmin: undefined,
  isAdmin: undefined,
  ordinaryPrototype: true,
  controlLabel: "synthetic-control-entry",
  keys: ["control"],
};

const expectedStrictObservations: Readonly<
  Record<SchemaOnlyCaseName, StrictEntryObservation>
> = {
  "zod-4.4-interpreted": strippedAndDropped,
  "zod-4.5-interpreted": strippedAndDropped,
  "zod-4.5-compiled": strippedAndDropped,
  ajv: rejectedByStrictEntry,
  typebox: rejectedByStrictEntry,
  valibot: strippedAndDropped,
};

describe("schema-only __proto__ handling without the manual normalizer", () => {
  test("the JSON fixture parses to a safe own data property", async () => {
    const input: unknown = JSON.parse(await readFile(FIXTURE_PATH, "utf8"));
    if (!isRecord(input)) {
      throw new Error("Expected the fixture to parse as an object");
    }
    expect(Object.hasOwn(input, "__proto__")).toBeTrue();
    expect(Object.getPrototypeOf(input)).toBe(Object.prototype);
    expect(input.isAdmin).toBeUndefined();
    expect(Object.keys(input)).toEqual(["control", "__proto__"]);
  });

  test("no validator output reports isAdmin === true", async () => {
    const input: unknown = JSON.parse(await readFile(FIXTURE_PATH, "utf8"));
    const globalPrototypeDescriptors = Object.getOwnPropertyDescriptors(
      Object.prototype,
    );
    const globalPrototypePrototype = Object.getPrototypeOf(Object.prototype);

    for (const schemaOnlyCase of cases()) {
      const observation = schemaOnlyCase.run(input);
      expect(observation, schemaOnlyCase.name).toEqual(
        expectedObservations[schemaOnlyCase.name],
      );
      expect(
        observation.isAdmin === true,
        `${schemaOnlyCase.name} must not expose an inherited isAdmin`,
      ).toBeFalse();
      expect(
        Object.getOwnPropertyDescriptors(Object.prototype),
        `${schemaOnlyCase.name} must not pollute global Object.prototype`,
      ).toEqual(globalPrototypeDescriptors);
      expect(
        Object.getPrototypeOf(Object.prototype),
        `${schemaOnlyCase.name} must not change Object.prototype's prototype`,
      ).toBe(globalPrototypePrototype);
    }
  });
});

describe("schema-only with non-loose entry schemas", () => {
  test("the marker survives nowhere", async () => {
    const input: unknown = JSON.parse(await readFile(FIXTURE_PATH, "utf8"));
    const globalPrototypeDescriptors = Object.getOwnPropertyDescriptors(
      Object.prototype,
    );
    const globalPrototypePrototype = Object.getPrototypeOf(Object.prototype);

    for (const strictCase of strictCases()) {
      const observation = strictCase.run(input);
      expect(observation, strictCase.name).toEqual(
        expectedStrictObservations[strictCase.name],
      );
      expect(
        observation.isAdmin === true,
        `${strictCase.name} must not expose an inherited isAdmin`,
      ).toBeFalse();
      expect(
        observation.protoValueIsAdmin === true,
        `${strictCase.name} must not retain the isAdmin marker`,
      ).toBeFalse();
      expect(
        Object.getOwnPropertyDescriptors(Object.prototype),
        `${strictCase.name} must not pollute global Object.prototype`,
      ).toEqual(globalPrototypeDescriptors);
      expect(
        Object.getPrototypeOf(Object.prototype),
        `${strictCase.name} must not change Object.prototype's prototype`,
      ).toBe(globalPrototypePrototype);
    }
  });

  test("Zod 4.4, Zod 4.5, and native-compiled Zod keep ordinary prototypes", async () => {
    const input: unknown = JSON.parse(await readFile(LABEL_FIXTURE_PATH, "utf8"));
    const globalPrototypeDescriptors = Object.getOwnPropertyDescriptors(
      Object.prototype,
    );

    const results = [
      zod44SimpleStrictRecordSchema.safeParse(input),
      SimpleStrictRecordSchema.safeParse(input),
      nativeCompiledSimpleStrictSchema.safeParse(input),
    ];
    for (const result of results) {
      expect(result.success).toBeTrue();
      if (!result.success || !isRecord(result.data)) {
        throw new Error("Zod strict parse failed");
      }
      expect(Object.keys(result.data)).toEqual(["control"]);
      expect(result.data.label).toBeUndefined();
      expect(Object.getPrototypeOf(result.data)).toBe(Object.prototype);
    }

    expect(
      Object.getOwnPropertyDescriptors(Object.prototype),
      "global Object.prototype must remain unpolluted",
    ).toEqual(globalPrototypeDescriptors);
  });
});
