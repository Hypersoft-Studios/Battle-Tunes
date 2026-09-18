import type { LogLevel } from "./logger";

export type AppConfig = {
	port: number;
	logLevel: LogLevel;
};

/**
 * Load and validate process environment. Secrets stay on the server.
 */
export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
	const logLevel = env.LOG_LEVEL;
	return {
		port: parsePort(env.PORT),
		logLevel: isLogLevel(logLevel) ? logLevel : "info",
	};
}

function parsePort(value: string | undefined): number {
	if (!value) {
		return 3000;
	}
	const port = Number.parseInt(value, 10);
	if (!Number.isInteger(port) || port < 1 || port > 65535) {
		throw new Error("PORT must be an integer from 1 to 65535.");
	}
	return port;
}

function isLogLevel(value: string | undefined): value is LogLevel {
	return value === "debug" || value === "info" || value === "warn" || value === "error";
}
