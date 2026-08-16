import Type from "typebox";

export const SimpleItemTypeBoxSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    count: Type.Integer({ minimum: 0 }),
    active: Type.Boolean(),
    tags: Type.Array(Type.String(), { maxItems: 3 }),
  },
  { additionalProperties: false },
);
