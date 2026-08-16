import { z } from "zod";

export const SimpleItemZodSchema = z.strictObject({
  id: z.string().min(1),
  count: z.number().int().nonnegative(),
  active: z.boolean(),
  tags: z.array(z.string()).max(3),
});
