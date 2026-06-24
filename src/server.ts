import { app } from "./app";
import { env } from "./config/env";

const server = app.listen(env.PORT, () => {
  console.log(`VINVERSE backend (Phase 2) running on port ${env.PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
});

process.on("SIGINT", () => {
  server.close(() => {
    console.log("Server shut down gracefully.");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  server.close(() => {
    console.log("Server shut down gracefully.");
    process.exit(0);
  });
});
