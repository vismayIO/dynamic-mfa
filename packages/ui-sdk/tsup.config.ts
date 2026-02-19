import { defineConfig } from "tsup"

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/components/ui/**/*.tsx",
    "src/hooks/**/*.ts",
    "src/lib/**/*.ts",
  ],
  format: ["esm"],
  dts: true,
  bundle: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: "es2022",
  outDir: "dist",
  outExtension({ format }) {
    return {
      js: format === "esm" ? ".mjs" : ".js",
    }
  },
})
