import "dotenv/config";
import { log } from "@repo/logger";
import { createServer } from "./server";

const port = process.env.PORT || 5001;

(async () => {
  try {
    const app = await createServer();

    app.listen(port, () => {
      log("info", "API server started", {
        port,
        environment: process.env.NODE_ENV || "development",
      });
    });
  } catch (error) {
    log("error", "Failed to start API server", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
})();
