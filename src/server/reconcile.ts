import { AppError } from "./app-error.ts";
import type { Logger } from "./logger.ts";
import type { ClerkPort, StripePort } from "./ports.ts";

export type ReconcileDeps = {
	clerk: ClerkPort;
	stripe: StripePort;
	logger: Logger;
};

/**
 * Confirm a paid Checkout Session and set Clerk publicMetadata.isPaid. Idempotent.
 *
 * @param request - Clerk session token and Stripe `sessionId`
 * @param deps - Clerk, Stripe, and logger ports
 * @returns `{ isPaid: true }`
 * @throws {AppError} UNAUTHORIZED | VALIDATION_ERROR | NOT_FOUND | FORBIDDEN | PAYMENT_NOT_COMPLETE | STRIPE_ERROR
 */
export async function handleReconcile(
	request: { sessionToken: string | undefined; sessionId: unknown },
	deps: ReconcileDeps,
): Promise<{ isPaid: true }> {
	if (!request.sessionToken) {
		throw new AppError("UNAUTHORIZED", 401, "Sign in required.");
	}
	const user = await deps.clerk.getUserFromSessionToken(request.sessionToken);
	if (!user) {
		throw new AppError("UNAUTHORIZED", 401, "Sign in required.");
	}

	if (
		typeof request.sessionId !== "string" ||
		request.sessionId.length < 1 ||
		request.sessionId.length > 256
	) {
		throw new AppError("VALIDATION_ERROR", 400, "Invalid request.");
	}

	let session;
	try {
		session = await deps.stripe.retrieveCheckoutSession(request.sessionId);
	} catch (error) {
		deps.logger.error("[reconcile.retrieve] Failed", {
			userId: user.id,
			error: error instanceof Error ? error.message : "unknown",
		});
		throw new AppError("STRIPE_ERROR", 502, "Payment is unavailable.");
	}

	if (!session) {
		throw new AppError("NOT_FOUND", 404, "Checkout session was not found.");
	}

	if (session.status !== "complete" || session.paymentStatus !== "paid") {
		throw new AppError("PAYMENT_NOT_COMPLETE", 409, "Payment is not complete.");
	}

	const ownedByReference = session.clientReferenceId === user.id;
	const ownedByCustomer =
		session.customerId !== null &&
		user.stripeCustomerId !== undefined &&
		session.customerId === user.stripeCustomerId;
	if (!ownedByReference && !ownedByCustomer) {
		throw new AppError("FORBIDDEN", 403, "This checkout does not belong to you.");
	}

	await deps.clerk.setPaid(user.id);
	deps.logger.info("[reconcile] isPaid set", { userId: user.id });
	return { isPaid: true };
}
