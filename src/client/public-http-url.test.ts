import { describe, expect, it } from "vitest";
import { publicHttpUrl } from "./public-http-url.ts";

describe("public-http-url", () => {
	it("accepts an http URL", () => {
		expect(publicHttpUrl("http://localhost:3001")).toBe("http://localhost:3001/");
	});

	it("accepts an https URL", () => {
		expect(publicHttpUrl("https://tunes.example.com/play")).toBe(
			"https://tunes.example.com/play",
		);
	});

	it("rejects an empty value", () => {
		expect(publicHttpUrl("")).toBeUndefined();
	});

	it("rejects a javascript URL", () => {
		expect(publicHttpUrl("javascript:alert(1)")).toBeUndefined();
	});

	it("rejects a relative path", () => {
		expect(publicHttpUrl("/tunes")).toBeUndefined();
	});
});
