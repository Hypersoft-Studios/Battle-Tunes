import { join } from "node:path";
import { loadConfig } from "./config";
import { createServer } from "./http";
import { loadDotEnv } from "./load-env";

process.on("uncaughtException", (error) => {
	console.error(error);
	process.exit(1);
});

process.on("unhandledRejection", (reason) => {
	console.error(reason);
	process.exit(1);
});

loadDotEnv();
const config = loadConfig(process.env);

const server = createServer({
	staticDir: join(process.cwd(), "dist/client"),
});

server.listen(config.port);
