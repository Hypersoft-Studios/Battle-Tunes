// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AccessState } from "./access-state.ts";
import { HomeView } from "./HomeView.tsx";

const LAUNCH_URL = "http://localhost:3001";

function renderHome(access: AccessState, battleTunesUrl = LAUNCH_URL) {
	return render(
		<HomeView
			access={access}
			onGetAccess={() => undefined}
			checkoutBusy={false}
			checkoutError={undefined}
			battleTunesUrl={battleTunesUrl}
		/>,
	);
}

describe("HomeView", () => {
	it("hides the Battle Tunes launch for a signed-out visitor", () => {
		renderHome("signed-out");
		expect(screen.queryByTestId("open-battle-tunes")).toBeNull();
	});

	it("shows sign-in and sign-up for a signed-out visitor", () => {
		renderHome("signed-out");
		expect(screen.getByTestId("sign-in")).toBeInTheDocument();
		expect(screen.getByTestId("sign-up")).toBeInTheDocument();
	});

	it("hides the Battle Tunes launch for a signed-in unpaid user", () => {
		renderHome("unpaid");
		expect(screen.queryByTestId("open-battle-tunes")).toBeNull();
	});

	it("shows Get access ($5) for a signed-in unpaid user", () => {
		renderHome("unpaid");
		expect(screen.getByTestId("get-access")).toHaveTextContent("Get access ($5)");
	});

	it("shows Open Battle Tunes for a paid user", () => {
		renderHome("paid");
		expect(screen.getByTestId("open-battle-tunes")).toHaveAttribute(
			"href",
			"http://localhost:3001/",
		);
	});

	it("hides Get access for a paid user", () => {
		renderHome("paid");
		expect(screen.queryByTestId("get-access")).toBeNull();
	});

	it("does not render a javascript launch href", () => {
		renderHome("paid", "javascript:alert(1)");
		expect(screen.queryByTestId("open-battle-tunes")).toBeNull();
		expect(screen.getByRole("alert")).toHaveTextContent("Battle Tunes is unavailable.");
	});
});
