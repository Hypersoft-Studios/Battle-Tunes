import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";
import { createServer } from "./http.ts";
import { silentLogger } from "./logger.ts";
import type { AppDeps } from "./ports.ts";
import { createMemoryClerk, createMemoryStripe, unpaidUser } from "./test-fakes.ts";

async function withServer(deps: AppDeps, run: (baseUrl: string) => Promise<void>): Promise<void> {
	const server = createServer(deps);
	server.listen(0, "127.0.0.1");
	await once(server, "listening");
	const address = server.address() as AddressInfo;
	try {
		await run(`http://127.0.0.1:${address.port}`);
	} finally {
		server.close();
		await once(server, "close");
	}
}

function testDeps(): AppDeps {
	return {
		logger: silentLogger,
		clerk: createMemoryClerk(unpaidUser()),
		stripe: createMemoryStripe({}),
		mail: {
			async sendContact(): Promise<void> {},
		},
		rateLimiter: { allow: () => true },
	};
}

describe("http", () => {
	it("returns UNAUTHORIZED JSON from POST /api/checkout without a session", async () => {
		await withServer(testDeps(), async (baseUrl) => {
			const response = await fetch(`${baseUrl}/api/checkout`, { method: "POST" });
			expect(response.status).toBe(401);
			expect(await response.json()).toMatchObject({ code: "UNAUTHORIZED" });
		});
	});

	it("returns VALIDATION_ERROR from POST /api/reconcile with a bad body", async () => {
		await withServer(testDeps(), async (baseUrl) => {
			const response = await fetch(`${baseUrl}/api/reconcile`, {
				method: "POST",
				headers: { authorization: "Bearer valid-token", "content-type": "application/json" },
				body: JSON.stringify({}),
			});
			expect(response.status).toBe(400);
			expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
		});
	});

	it("returns sent true from POST /api/contact", async () => {
		await withServer(testDeps(), async (baseUrl) => {
			const response = await fetch(`${baseUrl}/api/contact`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					email: "fan@example.com",
					subject: "Hi",
					message: "Hello from tests",
				}),
			});
			expect(response.status).toBe(200);
			expect(await response.json()).toEqual({ sent: true });
		});
	});

	it("returns 404 JSON for an unknown API route", async () => {
		await withServer(testDeps(), async (baseUrl) => {
			const response = await fetch(`${baseUrl}/api/unknown`, { method: "POST" });
			expect(response.status).toBe(404);
			expect(await response.json()).toMatchObject({ code: "NOT_FOUND" });
		});
	});
});
