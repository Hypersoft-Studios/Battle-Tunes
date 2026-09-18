export type AppConfig = {
	port: number;
};

/**
 * Load and validate process environment. Secrets stay on the server.
 */
export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
	return {
		port: parsePort(env.PORT),
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
