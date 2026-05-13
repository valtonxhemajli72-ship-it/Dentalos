import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

process.env.DATABASE_URL ??= "postgresql://USER:PASSWORD@HOST:5432/DATABASE";

const require = createRequire(import.meta.url);
const prismaCli = require.resolve("prisma/build/index.js");
const result = spawnSync(process.execPath, [prismaCli, "validate"], {
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
