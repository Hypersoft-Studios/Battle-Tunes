import type { ClerkPort, ClerkUser, StripeCheckoutSession, StripePort } from "./ports.ts";

export function createMemoryClerk(initial: ClerkUser): ClerkPort & { snapshot: () => ClerkUser } {
	let user = initial;
	return {
		async getUserFromSessionToken(token: string): Promise<ClerkUser | undefined> {
			if (token !== "valid-token") {
				return undefined;
			}
			return user;
		},
		async setPaid(): Promise<void> {
			user = { ...user, isPaid: true };
		},
		async setStripeCustomerId(_userId: string, customerId: string): Promise<void> {
			user = { ...user, stripeCustomerId: customerId };
		},
		snapshot: (): ClerkUser => user,
	};
}

export function unpaidUser(overrides?: Partial<ClerkUser>): ClerkUser {
	return {
		id: "user_1",
		isPaid: false,
		stripeCustomerId: "cus_1",
		...overrides,
	};
}

export function session(
	partial: Partial<StripeCheckoutSession> & Pick<StripeCheckoutSession, "id" | "status">,
): StripeCheckoutSession {
	return {
		url: null,
		paymentStatus: "unpaid",
		clientReferenceId: "user_1",
		customerId: "cus_1",
		...partial,
	};
}

export function createMemoryStripe(options: {
	sessions?: StripeCheckoutSession[];
	customerId?: string;
	onCreate?: (idempotencyKey: string) => void;
	failList?: boolean;
	failCreate?: boolean;
}): StripePort {
	const sessions = [...(options.sessions ?? [])];
	return {
		async getOrCreateCustomer(params): Promise<string> {
			return params.existingCustomerId ?? options.customerId ?? "cus_new";
		},
		async listCheckoutSessions(): Promise<StripeCheckoutSession[]> {
			if (options.failList) {
				throw new Error("stripe list failed");
			}
			return sessions;
		},
		async createCheckoutSession(params): Promise<{ checkoutUrl: string; sessionId: string }> {
			if (options.failCreate) {
				throw new Error("stripe create failed");
			}
			options.onCreate?.(params.idempotencyKey);
			return { checkoutUrl: "https://checkout.stripe.test/cs_new", sessionId: "cs_new" };
		},
		async retrieveCheckoutSession(sessionId: string): Promise<StripeCheckoutSession | undefined> {
			return sessions.find((item) => item.id === sessionId);
		},
	};
}
