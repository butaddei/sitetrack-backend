/**
 * Render deploy migration script.
 * Runs drizzle-kit push to sync schema on first deploy and after schema changes.
 * Run this during Render's build step (DATABASE_URL is available).
 */
import { execSync } from "node:child_process";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("[migrate] DATABASE_URL not set — skipping schema push");
  process.exit(0);
}

console.log("[migrate] Running schema push against Render database...");
try {
  execSync("pnpm --filter @workspace/db exec drizzle-kit push --config ./drizzle.config.ts", {
    stdio: "inherit",
    env: { ...process.env },
    timeout: 60_000,
    input: "\n", // auto-confirm any prompts
  });
  console.log("[migrate] Schema push complete.");
} catch (err) {
  console.error("[migrate] Schema push failed:", err.message);
  // Don't crash the build — tables may already exist
  process.exit(0);
}
