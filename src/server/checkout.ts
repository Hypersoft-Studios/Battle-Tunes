import { AppError } from "./app-error.ts";
import type { Logger } from "./logger.ts";
import type { ClerkPort, StripePort } from "./ports.ts";

export type CheckoutDeps = {
	clerk: ClerkPort;
	stripe: StripePort;
	logger: Logger;
};

/**
 * Start or resume the $5 purchase. Order: Clerk isPaid, heal complete, reuse open, then create.
 *
 * @param request - Clerk session token from the Authorization header
 * @param deps - Clerk, Stripe, and logger ports
 * @returns `{ checkoutUrl }` for a new or already-open session
 * @throws {AppError} UNAUTHORIZED - missing or invalid session
 * @throws {AppError} ALREADY_PAID - Clerk isPaid or a complete Stripe session
 * @throws {AppError} STRIPE_ERROR - customer, list, or create failed
 */
export async function handleCheckout(
	request: { sessionToken: string | undefined },
	deps: CheckoutDeps,
): Promise<{ checkoutUrl: string }> {
	const user = await requireUser(request.sessionToken, deps.clerk);
	if (user.isPaid) {
		throw new AppError("ALREADY_PAID", 409, "Access is already included.");
	}

	let customerId: string;
	try {
		customerId = await deps.stripe.getOrCreateCustomer({
			clerkUserId: user.id,
			existingCustomerId: user.stripeCustomerId,
		});
	} catch (error) {
		deps.logger.error("[checkout.customer] Failed", {
			userId: user.id,
			error: errorMessage(error),
		});
		throw new AppError("STRIPE_ERROR", 502, "Payment is unavailable.");
	}

	if (customerId !== user.stripeCustomerId) {
		await deps.clerk.setStripeCustomerId(user.id, customerId);
	}

	let sessions;
	try {
		sessions = await deps.stripe.listCheckoutSessions(customerId);
	} catch (error) {
		deps.logger.error("[checkout.list] Failed", { userId: user.id, error: errorMessage(error) });
		throw new AppError("STRIPE_ERROR", 502, "Payment is unavailable.");
	}

	const complete = sessions.find(
		(item) => item.status === "complete" || item.paymentStatus === "paid",
	);
	if (complete) {
		await deps.clerk.setPaid(user.id);
		throw new AppError("ALREADY_PAID", 409, "Access is already included.");
	}

	const open = sessions.find((item) => item.status === "open");
	if (open) {
		if (!open.url) {
			deps.logger.error("[checkout.open] Session missing URL", {
				userId: user.id,
				sessionId: open.id,
			});
			throw new AppError("STRIPE_ERROR", 502, "Payment is unavailable.");
		}
		return { checkoutUrl: open.url };
	}

	const expired = sessions.find((item) => item.status === "expired");
	const idempotencyKey = expired
		? `battle-tunes-checkout:${user.id}:${expired.id}`
		: `battle-tunes-checkout:${user.id}`;

	try {
		const created = await deps.stripe.createCheckoutSession({
			customerId,
			clerkUserId: user.id,
			idempotencyKey,
		});
		deps.logger.info("[checkout.create] Session created", { userId: user.id });
		return { checkoutUrl: created.checkoutUrl };
	} catch (error) {
		deps.logger.error("[checkout.create] Failed", { userId: user.id, error: errorMessage(error) });
		throw new AppError("STRIPE_ERROR", 502, "Payment is unavailable.");
	}
}

async function requireUser(sessionToken: string | undefined, clerk: ClerkPort) {
	if (!sessionToken) {
		throw new AppError("UNAUTHORIZED", 401, "Sign in required.");
	}
	const user = await clerk.getUserFromSessionToken(sessionToken);
	if (!user) {
		throw new AppError("UNAUTHORIZED", 401, "Sign in required.");
	}
	return user;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : "unknown";
}
