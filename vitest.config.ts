import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 30000,
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["examples/**", "node_modules/**", "dist/**"],
  },
});

