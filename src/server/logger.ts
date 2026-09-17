export type LogLevel = "debug" | "info" | "warn" | "error";

export type Logger = {
	debug(message: string, context?: Record<string, unknown>): void;
	info(message: string, context?: Record<string, unknown>): void;
	warn(message: string, context?: Record<string, unknown>): void;
	error(message: string, context?: Record<string, unknown>): void;
};

const levelOrder: Record<LogLevel, number> = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40,
};

/**
 * JSON logger for request-boundary events. Never pass emails or message bodies.
 */
export function createConsoleLogger(minLevel: LogLevel = "info"): Logger {
	const min = levelOrder[minLevel];
	const write = (level: LogLevel, message: string, context?: Record<string, unknown>): void => {
		if (levelOrder[level] < min) {
			return;
		}
		const line = JSON.stringify({
			level,
			msg: message,
			time: new Date().toISOString(),
			...context,
		});
		if (level === "error") {
			process.stderr.write(`${line}\n`);
			return;
		}
		process.stdout.write(`${line}\n`);
	};
	return {
		debug: (message, context) => write("debug", message, context),
		info: (message, context) => write("info", message, context),
		warn: (message, context) => write("warn", message, context),
		error: (message, context) => write("error", message, context),
	};
}

/** Test logger that records nothing. */
export const silentLogger: Logger = {
	debug() {},
	info() {},
	warn() {},
	error() {},
};
