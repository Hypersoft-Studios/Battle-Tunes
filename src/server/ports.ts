import type { Logger } from "./logger.ts";

export type ClerkUser = {
	id: string;
	isPaid: boolean;
	stripeCustomerId: string | undefined;
};

export type ClerkPort = {
	getUserFromSessionToken(token: string): Promise<ClerkUser | undefined>;
	setPaid(userId: string): Promise<void>;
	setStripeCustomerId(userId: string, customerId: string): Promise<void>;
};

export type StripeCheckoutSession = {
	id: string;
	url: string | null;
	status: "open" | "complete" | "expired";
	paymentStatus: "paid" | "unpaid" | "no_payment_required";
	clientReferenceId: string | null;
	customerId: string | null;
};

export type StripePort = {
	getOrCreateCustomer(params: {
		clerkUserId: string;
		existingCustomerId: string | undefined;
	}): Promise<string>;
	listCheckoutSessions(customerId: string): Promise<StripeCheckoutSession[]>;
	createCheckoutSession(params: {
		customerId: string;
		clerkUserId: string;
		idempotencyKey: string;
	}): Promise<{ checkoutUrl: string; sessionId: string }>;
	retrieveCheckoutSession(sessionId: string): Promise<StripeCheckoutSession | undefined>;
};

export type MailPort = {
	sendContact(input: { replyTo: string; subject: string; text: string }): Promise<void>;
};

export type RateLimiter = {
	allow(key: string): boolean;
};

export type AppDeps = {
	logger: Logger;
	clerk: ClerkPort;
	stripe: StripePort;
	mail: MailPort;
	rateLimiter: RateLimiter;
	staticDir?: string;
};
