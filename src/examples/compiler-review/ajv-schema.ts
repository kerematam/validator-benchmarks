export const SIMPLE_ITEM_AJV_SCHEMA: object = {
  $id: "https://synthetic.invalid/simple-item.schema.json",
  type: "object",
  additionalProperties: false,
  required: ["id", "count", "active", "tags"],
  properties: {
    id: { type: "string", minLength: 1 },
    count: { type: "integer", minimum: 0 },
    active: { type: "boolean" },
    tags: {
      type: "array",
      maxItems: 3,
      items: { type: "string" },
    },
  },
};
