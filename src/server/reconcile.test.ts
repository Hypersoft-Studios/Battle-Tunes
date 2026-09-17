import { describe, expect, it } from "vitest";
import { handleReconcile } from "./reconcile.ts";
import { silentLogger } from "./logger.ts";
import { createMemoryClerk, createMemoryStripe, session, unpaidUser } from "./test-fakes.ts";

describe("reconcile", () => {
	it("rejects a missing Clerk session", async () => {
		await expect(
			handleReconcile(
				{ sessionToken: undefined, sessionId: "cs_1" },
				{
					clerk: createMemoryClerk(unpaidUser()),
					stripe: createMemoryStripe({}),
					logger: silentLogger,
				},
			),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});

	it("rejects a missing sessionId", async () => {
		await expect(
			handleReconcile(
				{ sessionToken: "valid-token", sessionId: "" },
				{
					clerk: createMemoryClerk(unpaidUser()),
					stripe: createMemoryStripe({}),
					logger: silentLogger,
				},
			),
		).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
	});

	it("returns NOT_FOUND for an unknown session", async () => {
		await expect(
			handleReconcile(
				{ sessionToken: "valid-token", sessionId: "cs_missing" },
				{
					clerk: createMemoryClerk(unpaidUser()),
					stripe: createMemoryStripe({ sessions: [] }),
					logger: silentLogger,
				},
			),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	it("returns PAYMENT_NOT_COMPLETE when the session is not paid", async () => {
		await expect(
			handleReconcile(
				{ sessionToken: "valid-token", sessionId: "cs_open" },
				{
					clerk: createMemoryClerk(unpaidUser()),
					stripe: createMemoryStripe({
						sessions: [session({ id: "cs_open", status: "open" })],
					}),
					logger: silentLogger,
				},
			),
		).rejects.toMatchObject({ code: "PAYMENT_NOT_COMPLETE" });
	});

	it("returns FORBIDDEN when the session belongs to another user", async () => {
		await expect(
			handleReconcile(
				{ sessionToken: "valid-token", sessionId: "cs_other" },
				{
					clerk: createMemoryClerk(unpaidUser()),
					stripe: createMemoryStripe({
						sessions: [
							session({
								id: "cs_other",
								status: "complete",
								paymentStatus: "paid",
								clientReferenceId: "user_other",
								customerId: "cus_other",
							}),
						],
					}),
					logger: silentLogger,
				},
			),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	it("sets isPaid for a paid session owned by the caller", async () => {
		const clerk = createMemoryClerk(unpaidUser());
		const result = await handleReconcile(
			{ sessionToken: "valid-token", sessionId: "cs_paid" },
			{
				clerk,
				stripe: createMemoryStripe({
					sessions: [
						session({
							id: "cs_paid",
							status: "complete",
							paymentStatus: "paid",
						}),
					],
				}),
				logger: silentLogger,
			},
		);
		expect(result).toEqual({ isPaid: true });
		expect(clerk.snapshot().isPaid).toBe(true);
	});

	it("returns isPaid on a repeat reconcile without error", async () => {
		const clerk = createMemoryClerk(unpaidUser({ isPaid: true }));
		const result = await handleReconcile(
			{ sessionToken: "valid-token", sessionId: "cs_paid" },
			{
				clerk,
				stripe: createMemoryStripe({
					sessions: [
						session({
							id: "cs_paid",
							status: "complete",
							paymentStatus: "paid",
						}),
					],
				}),
				logger: silentLogger,
			},
		);
		expect(result).toEqual({ isPaid: true });
	});
});
