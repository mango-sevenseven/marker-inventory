import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const app = createApp(config);
const server = app.listen(config.port, "0.0.0.0", () => {
  console.log(`Marker Inventory API listening on port ${config.port}`);
});

function shutdown() {
  server.close(() => {
    app.locals.closeDatabase();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
