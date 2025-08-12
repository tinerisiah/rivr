import { defineConfig, type Options } from "tsup";

export default defineConfig((options: Options) => ({
  entry: ["src/**/*.{ts,js}"],
  clean: true,
  format: ["esm"],
  noExternal: ["@repo/logger", "@repo/schema"],
  ...options,
}));
