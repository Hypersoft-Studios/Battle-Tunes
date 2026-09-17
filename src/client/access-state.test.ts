import { describe, expect, it } from "vitest";
import { accessStateFromUser } from "./access-state.ts";

describe("access-state", () => {
	it("treats a missing user as signed-out", () => {
		expect(accessStateFromUser(null)).toBe("signed-out");
	});

	it("treats a signed-in user without isPaid as unpaid", () => {
		expect(accessStateFromUser({ publicMetadata: {} })).toBe("unpaid");
	});

	it("does not treat a string isPaid as paid", () => {
		expect(accessStateFromUser({ publicMetadata: { isPaid: "true" } })).toBe("unpaid");
	});

	it("treats publicMetadata.isPaid true as paid", () => {
		expect(accessStateFromUser({ publicMetadata: { isPaid: true } })).toBe("paid");
	});
});
