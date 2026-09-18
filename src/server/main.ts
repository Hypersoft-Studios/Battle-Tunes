import { join } from "node:path";
import { loadConfig } from "./config";
import { createServer } from "./http";
import { loadDotEnv } from "./load-env";
import { createConsoleLogger } from "./logger";

loadDotEnv();
const config = loadConfig(process.env);
const logger = createConsoleLogger(config.logLevel);

const server = createServer({
	logger,
	staticDir: join(process.cwd(), "dist/client"),
});

server.listen(config.port, () => {
	logger.info("[main] Listening", { port: config.port });
});
