import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    reporters: ["default"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@antiable/presence": path.resolve(__dirname, "../../packages/presence/src/index.ts"),
      "@antiable/bangumi": path.resolve(__dirname, "../../packages/bangumi/src/index.ts"),
      "@antiable/anitabi": path.resolve(__dirname, "../../packages/anitabi/src/index.ts"),
    },
  },
});
