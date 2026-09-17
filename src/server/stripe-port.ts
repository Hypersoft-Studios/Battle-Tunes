import Stripe from "stripe";
import type { StripeCheckoutSession, StripePort } from "./ports.ts";

/**
 * Stripe Checkout adapter. Session list is keyed by Customer, not client_reference_id.
 */
export function createStripePort(params: {
	secretKey: string;
	priceId: string;
	publicBaseUrl: string;
}): StripePort {
	const stripe = new Stripe(params.secretKey);
	return {
		async getOrCreateCustomer({ clerkUserId, existingCustomerId }): Promise<string> {
			if (existingCustomerId) {
				return existingCustomerId;
			}
			const customer = await stripe.customers.create({
				metadata: { clerkUserId },
			});
			return customer.id;
		},
		async listCheckoutSessions(customerId: string): Promise<StripeCheckoutSession[]> {
			const list = await stripe.checkout.sessions.list({
				customer: customerId,
				limit: 100,
			});
			return list.data.map(mapSession);
		},
		async createCheckoutSession({ customerId, clerkUserId, idempotencyKey }): Promise<{
			checkoutUrl: string;
			sessionId: string;
		}> {
			const created = await stripe.checkout.sessions.create(
				{
					mode: "payment",
					customer: customerId,
					client_reference_id: clerkUserId,
					line_items: [{ price: params.priceId, quantity: 1 }],
					success_url: `${params.publicBaseUrl}/?session_id={CHECKOUT_SESSION_ID}`,
					cancel_url: params.publicBaseUrl,
				},
				{ idempotencyKey },
			);
			if (!created.url) {
				throw new Error("Checkout session is missing a URL.");
			}
			return { checkoutUrl: created.url, sessionId: created.id };
		},
		async retrieveCheckoutSession(sessionId: string): Promise<StripeCheckoutSession | undefined> {
			try {
				const found = await stripe.checkout.sessions.retrieve(sessionId);
				return mapSession(found);
			} catch (error) {
				if (isNotFound(error)) {
					return undefined;
				}
				throw error;
			}
		},
	};
}

function mapSession(session: Stripe.Checkout.Session): StripeCheckoutSession {
	return {
		id: session.id,
		url: session.url,
		status: readStatus(session.status),
		paymentStatus: readPaymentStatus(session.payment_status),
		clientReferenceId: session.client_reference_id,
		customerId: readCustomerId(session.customer),
	};
}

function readStatus(value: string | null): StripeCheckoutSession["status"] {
	if (value === "open" || value === "complete" || value === "expired") {
		return value;
	}
	return "expired";
}

function readPaymentStatus(value: string): StripeCheckoutSession["paymentStatus"] {
	if (value === "paid" || value === "unpaid" || value === "no_payment_required") {
		return value;
	}
	return "unpaid";
}

function readCustomerId(customer: Stripe.Checkout.Session["customer"]): string | null {
	if (typeof customer === "string") {
		return customer;
	}
	if (
		customer &&
		typeof customer === "object" &&
		"id" in customer &&
		typeof customer.id === "string"
	) {
		return customer.id;
	}
	return null;
}

function isNotFound(error: unknown): boolean {
	return (
		typeof error === "object" && error !== null && "statusCode" in error && error.statusCode === 404
	);
}
