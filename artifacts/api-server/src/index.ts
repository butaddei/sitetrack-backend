import app from "./app";
import { logger } from "./lib/logger";
import { runMigrations } from "./migrate";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function main() {
  // Auto-create all tables on startup (idempotent, safe to run every boot)
  await runMigrations();

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");

    if (process.env["NODE_ENV"] === "production") {
      const PING_INTERVAL_MS = 9 * 60 * 1000; // 9 minutes (under 10min autoscale threshold)
      const selfPingUrl = `http://localhost:${port}/api/healthz`;

      setInterval(() => {
        fetch(selfPingUrl)
          .then(() => logger.info("Keep-alive ping OK"))
          .catch((err) => logger.warn({ err }, "Keep-alive ping failed"));
      }, PING_INTERVAL_MS);

      logger.info({ url: selfPingUrl, intervalMs: PING_INTERVAL_MS }, "Keep-alive enabled");
    }
  });
}

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
