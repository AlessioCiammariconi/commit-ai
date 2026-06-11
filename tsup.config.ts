import { defineConfig } from "tsup";
import { readFileSync } from "fs";
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8")) as { version: string };

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node18",
  clean: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
});
