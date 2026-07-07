import { fileURLToPath } from "node:url";

import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  // Apply only the schema migration in tests — 0002_seed.sql is local-dev
  // seed data (shared demo password) and tests seed their own fixtures.
  const migrationsPath = fileURLToPath(new URL("migrations", import.meta.url));
  const allMigrations = await readD1Migrations(migrationsPath);
  const migrations = allMigrations.filter(
    (migration) => !migration.name.includes("seed"),
  );

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            JWT_SECRET: "test-jwt-secret",
          },
        },
      }),
    ],
    test: {
      include: ["test/**/*.test.js"],
      setupFiles: ["./test/apply-migrations.js"],
    },
  };
});
