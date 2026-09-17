import { join } from "node:path";
import { createClerkPort } from "./clerk-port.ts";
import { loadConfig } from "./config.ts";
import { createServer } from "./http.ts";
import { loadDotEnv } from "./load-env.ts";
import { createConsoleLogger } from "./logger.ts";
import { createMailPort } from "./mail-port.ts";
import { MemoryRateLimiter } from "./rate-limit.ts";
import { createStripePort } from "./stripe-port.ts";

loadDotEnv();
const config = loadConfig(process.env);
const logger = createConsoleLogger(config.logLevel);

const server = createServer({
	logger,
	clerk: createClerkPort(config.clerkSecretKey),
	stripe: createStripePort({
		secretKey: config.stripeSecretKey,
		priceId: config.stripePriceId,
		publicBaseUrl: config.publicBaseUrl,
	}),
	mail: createMailPort({
		apiKey: config.resendApiKey,
		fromAddress: config.resendFromAddress,
		supportInbox: config.supportInboxEmail,
	}),
	rateLimiter: new MemoryRateLimiter(5, 15 * 60 * 1000),
	staticDir: join(process.cwd(), "dist/client"),
});

server.listen(config.port, () => {
	logger.info("[main] Listening", { port: config.port });
});
