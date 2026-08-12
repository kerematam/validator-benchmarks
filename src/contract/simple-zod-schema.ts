import { z } from "zod";

export const SimpleEntrySchema = z.looseObject({
  label: z.string().optional(),
});

export const SimpleRecordSchema = z.record(z.string(), SimpleEntrySchema);

export const SimpleStrictEntrySchema = z.object({
  label: z.string().optional(),
});

export const SimpleStrictRecordSchema = z.record(
  z.string(),
  SimpleStrictEntrySchema,
);
