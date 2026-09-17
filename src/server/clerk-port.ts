import { createClerkClient, verifyToken } from "@clerk/backend";
import type { ClerkPort, ClerkUser } from "./ports.ts";

/**
 * Clerk-backed user lookup and metadata writes. The client never sets isPaid.
 */
export function createClerkPort(secretKey: string): ClerkPort {
	const clerk = createClerkClient({ secretKey });
	return {
		async getUserFromSessionToken(token: string): Promise<ClerkUser | undefined> {
			try {
				const payload = await verifyToken(token, { secretKey });
				const userId = payload.sub;
				if (!userId) {
					return undefined;
				}
				const user = await clerk.users.getUser(userId);
				return {
					id: user.id,
					isPaid: isPaidMetadata(user.publicMetadata),
					stripeCustomerId: stripeCustomerIdMetadata(user.privateMetadata),
				};
			} catch {
				return undefined;
			}
		},
		async setPaid(userId: string): Promise<void> {
			await clerk.users.updateUserMetadata(userId, {
				publicMetadata: { isPaid: true },
			});
		},
		async setStripeCustomerId(userId: string, customerId: string): Promise<void> {
			await clerk.users.updateUserMetadata(userId, {
				privateMetadata: { stripeCustomerId: customerId },
			});
		},
	};
}

function isPaidMetadata(metadata: unknown): boolean {
	if (typeof metadata !== "object" || metadata === null) {
		return false;
	}
	if (!("isPaid" in metadata)) {
		return false;
	}
	return metadata.isPaid === true;
}

function stripeCustomerIdMetadata(metadata: unknown): string | undefined {
	if (typeof metadata !== "object" || metadata === null) {
		return undefined;
	}
	if (!("stripeCustomerId" in metadata)) {
		return undefined;
	}
	const value = metadata.stripeCustomerId;
	return typeof value === "string" && value.length > 0 ? value : undefined;
}
