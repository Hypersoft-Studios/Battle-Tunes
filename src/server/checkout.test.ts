import { describe, expect, it } from "vitest";
import { handleCheckout } from "./checkout.ts";
import { silentLogger } from "./logger.ts";
import { createMemoryClerk, createMemoryStripe, session, unpaidUser } from "./test-fakes.ts";

describe("checkout", () => {
	it("rejects a missing Clerk session", async () => {
		const stripe = createMemoryStripe({});
		await expect(
			handleCheckout(
				{ sessionToken: undefined },
				{ clerk: createMemoryClerk(unpaidUser()), stripe, logger: silentLogger },
			),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});

	it("rejects an invalid Clerk session", async () => {
		await expect(
			handleCheckout(
				{ sessionToken: "bad-token" },
				{
					clerk: createMemoryClerk(unpaidUser()),
					stripe: createMemoryStripe({}),
					logger: silentLogger,
				},
			),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});

	it("aborts when Clerk isPaid is already true", async () => {
		const keys: string[] = [];
		const stripe = createMemoryStripe({ onCreate: (key) => keys.push(key) });
		await expect(
			handleCheckout(
				{ sessionToken: "valid-token" },
				{
					clerk: createMemoryClerk(unpaidUser({ isPaid: true })),
					stripe,
					logger: silentLogger,
				},
			),
		).rejects.toMatchObject({ code: "ALREADY_PAID" });
		expect(keys).toEqual([]);
	});

	it("heals a complete Stripe session by setting isPaid", async () => {
		const clerk = createMemoryClerk(unpaidUser());
		const keys: string[] = [];
		await expect(
			handleCheckout(
				{ sessionToken: "valid-token" },
				{
					clerk,
					stripe: createMemoryStripe({
						onCreate: (key) => keys.push(key),
						sessions: [
							session({
								id: "cs_paid",
								status: "complete",
								paymentStatus: "paid",
								url: "https://checkout.stripe.test/cs_paid",
							}),
						],
					}),
					logger: silentLogger,
				},
			),
		).rejects.toMatchObject({ code: "ALREADY_PAID" });
		expect(clerk.snapshot().isPaid).toBe(true);
		expect(keys).toEqual([]);
	});

	it("returns an existing open Checkout Session URL", async () => {
		const keys: string[] = [];
		const result = await handleCheckout(
			{ sessionToken: "valid-token" },
			{
				clerk: createMemoryClerk(unpaidUser()),
				stripe: createMemoryStripe({
					onCreate: (key) => keys.push(key),
					sessions: [
						session({
							id: "cs_open",
							status: "open",
							url: "https://checkout.stripe.test/cs_open",
						}),
					],
				}),
				logger: silentLogger,
			},
		);
		expect(result).toEqual({ checkoutUrl: "https://checkout.stripe.test/cs_open" });
		expect(keys).toEqual([]);
	});

	it("creates a session with the stable idempotency key when none exist", async () => {
		const keys: string[] = [];
		const result = await handleCheckout(
			{ sessionToken: "valid-token" },
			{
				clerk: createMemoryClerk(unpaidUser()),
				stripe: createMemoryStripe({ onCreate: (key) => keys.push(key) }),
				logger: silentLogger,
			},
		);
		expect(result).toEqual({ checkoutUrl: "https://checkout.stripe.test/cs_new" });
		expect(keys).toEqual(["battle-tunes-checkout:user_1"]);
	});

	it("uses an expiry-scoped idempotency key when only expired sessions exist", async () => {
		const keys: string[] = [];
		await handleCheckout(
			{ sessionToken: "valid-token" },
			{
				clerk: createMemoryClerk(unpaidUser()),
				stripe: createMemoryStripe({
					onCreate: (key) => keys.push(key),
					sessions: [session({ id: "cs_exp", status: "expired" })],
				}),
				logger: silentLogger,
			},
		);
		expect(keys).toEqual(["battle-tunes-checkout:user_1:cs_exp"]);
	});

	it("sends the same idempotency key for overlapping first-time creates", async () => {
		const keys: string[] = [];
		const deps = {
			clerk: createMemoryClerk(unpaidUser()),
			stripe: createMemoryStripe({ onCreate: (key) => keys.push(key) }),
			logger: silentLogger,
		};
		await Promise.all([
			handleCheckout({ sessionToken: "valid-token" }, deps),
			handleCheckout({ sessionToken: "valid-token" }, deps),
		]);
		expect(keys).toEqual(["battle-tunes-checkout:user_1", "battle-tunes-checkout:user_1"]);
	});

	it("persists a new Stripe Customer id on Clerk", async () => {
		const clerk = createMemoryClerk(unpaidUser({ stripeCustomerId: undefined }));
		await handleCheckout(
			{ sessionToken: "valid-token" },
			{
				clerk,
				stripe: createMemoryStripe({ customerId: "cus_created" }),
				logger: silentLogger,
			},
		);
		expect(clerk.snapshot().stripeCustomerId).toBe("cus_created");
	});

	it("maps Stripe list failures to STRIPE_ERROR", async () => {
		await expect(
			handleCheckout(
				{ sessionToken: "valid-token" },
				{
					clerk: createMemoryClerk(unpaidUser()),
					stripe: createMemoryStripe({ failList: true }),
					logger: silentLogger,
				},
			),
		).rejects.toMatchObject({ code: "STRIPE_ERROR" });
	});

	it("maps Stripe create failures to STRIPE_ERROR", async () => {
		await expect(
			handleCheckout(
				{ sessionToken: "valid-token" },
				{
					clerk: createMemoryClerk(unpaidUser()),
					stripe: createMemoryStripe({ failCreate: true }),
					logger: silentLogger,
				},
			),
		).rejects.toMatchObject({ code: "STRIPE_ERROR" });
	});
});
