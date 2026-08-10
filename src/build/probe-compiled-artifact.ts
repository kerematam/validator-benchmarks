import { resolve } from "node:path";
import { loadCompiledZodAdapter } from "../validators/load-compiled-zod";

const artifactArgument = Bun.argv[2];
if (artifactArgument === undefined) {
  throw new Error("Compiled artifact path is required");
}

const adapter = await loadCompiledZodAdapter(resolve(artifactArgument));
const result = adapter.validate({
  data: [
    {
      header: {},
      businessObject: { name: "Synthetic Probe Object" },
      table: { columns: [{ key: "synthetic_column_01" }], rows: [] },
    },
  ],
});
if (!result.success) {
  throw new Error("Compiled artifact rejected its compatibility probe");
}

console.log(JSON.stringify({ status: "pass" }));
