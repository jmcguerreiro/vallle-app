import { applyD1Migrations, env } from "cloudflare:test";

// Runs once per test file (setup file); vitest-pool-workers' isolated storage
// rolls per-test writes back, but migrations applied here persist for the file.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
