import type { ReactNode } from "react";
import type { AccessState } from "./access-state.ts";
import { ContactForm, type ContactFormProps } from "./ContactForm.tsx";
import { publicHttpUrl } from "./public-http-url.ts";

export interface HomeViewProps {
	access: AccessState;
	onGetAccess: () => void;
	checkoutBusy: boolean;
	checkoutError: string | undefined;
	battleTunesUrl: string;
	signIn?: ReactNode;
	signUp?: ReactNode;
	userMenu?: ReactNode;
	contact?: ContactFormProps;
}

/**
 * `/` presenter: signed-out, unpaid Get access, or a same-tab launch to Battle Tunes.
 */
export function HomeView({
	access,
	onGetAccess,
	checkoutBusy,
	checkoutError,
	battleTunesUrl,
	signIn,
	signUp,
	userMenu,
	contact,
}: HomeViewProps) {
	const launchHref = publicHttpUrl(battleTunesUrl);

	return (
		<div className="page">
			<header className="site-header">
				<p className="eyebrow">Battle Tunes</p>
				{userMenu ? <div className="user-menu">{userMenu}</div> : null}
			</header>
			<main>
				{access === "signed-out" ? (
					<section className="panel" aria-labelledby="welcome-heading">
						<h1 id="welcome-heading">Sign in to continue</h1>
						<p>Create a free account, then pay $5 once to unlock Battle Tunes.</p>
						<div className="actions">
							<div data-testid="sign-in">{signIn ?? "Sign in"}</div>
							<div data-testid="sign-up">{signUp ?? "Sign up"}</div>
						</div>
					</section>
				) : null}
				{access === "unpaid" ? (
					<section className="panel" aria-labelledby="access-heading">
						<h1 id="access-heading">Get access</h1>
						<p>You are signed in. Pay $5 once to use Battle Tunes.</p>
						<button
							type="button"
							className="button"
							data-testid="get-access"
							onClick={onGetAccess}
							disabled={checkoutBusy}
							aria-busy={checkoutBusy}
						>
							{checkoutBusy ? "Starting checkout…" : "Get access ($5)"}
						</button>
						{checkoutError ? (
							<p className="error" role="alert">
								{checkoutError}
							</p>
						) : null}
					</section>
				) : null}
				{access === "paid" ? (
					<section className="panel" aria-labelledby="tunes-heading">
						<h1 id="tunes-heading">Battle Tunes</h1>
						{launchHref ? (
							<>
								<p>Opens Battle Tunes on its own server in this tab.</p>
								<a className="button" href={launchHref} data-testid="open-battle-tunes">
									Open Battle Tunes
								</a>
							</>
						) : (
							<p className="error" role="alert">
								Battle Tunes is unavailable.
							</p>
						)}
					</section>
				) : null}
				{contact ? (
					<section className="panel" aria-labelledby="contact-heading">
						<h2 id="contact-heading">Contact support</h2>
						<ContactForm {...contact} />
					</section>
				) : null}
			</main>
		</div>
	);
}
