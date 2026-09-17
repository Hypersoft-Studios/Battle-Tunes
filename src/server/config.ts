import type { LogLevel } from "./logger.ts";

export type AppConfig = {
	clerkSecretKey: string;
	clerkPublishableKey: string;
	stripeSecretKey: string;
	stripePriceId: string;
	resendApiKey: string;
	resendFromAddress: string;
	supportInboxEmail: string;
	publicBaseUrl: string;
	port: number;
	logLevel: LogLevel;
};

/**
 * Load and validate process environment. Secrets stay on the server.
 */
export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
	const logLevel = env.LOG_LEVEL;
	return {
		clerkSecretKey: required(env, "CLERK_SECRET_KEY"),
		clerkPublishableKey: required(env, "CLERK_PUBLISHABLE_KEY"),
		stripeSecretKey: required(env, "STRIPE_SECRET_KEY"),
		stripePriceId: required(env, "STRIPE_PRICE_ID"),
		resendApiKey: required(env, "RESEND_API_KEY"),
		resendFromAddress: required(env, "RESEND_FROM_ADDRESS"),
		supportInboxEmail: required(env, "SUPPORT_INBOX_EMAIL"),
		publicBaseUrl: required(env, "PUBLIC_BASE_URL").replace(/\/$/, ""),
		port: parsePort(env.PORT),
		logLevel: isLogLevel(logLevel) ? logLevel : "info",
	};
}

function required(env: NodeJS.ProcessEnv, name: string): string {
	const value = env[name]?.trim();
	if (!value) {
		throw new Error(`Missing required environment variable ${name}.`);
	}
	return value;
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
