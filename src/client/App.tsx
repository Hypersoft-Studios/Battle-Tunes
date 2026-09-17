import {
	SignInButton,
	SignUpButton,
	UserButton,
	useAuth,
	useSession,
	useUser,
} from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { accessStateFromUser } from "./access-state.ts";
import { postCheckout, postContact, postReconcile } from "./api.ts";
import { HomeView } from "./HomeView.tsx";
import { publicHttpUrl } from "./public-http-url.ts";

/** Root client tree: success-URL reconcile, otherwise the home gate. */
export function App() {
	const params = new URLSearchParams(window.location.search);
	const sessionId = params.get("session_id");
	if (sessionId) {
		return <ReconcileScreen sessionId={sessionId} />;
	}
	return <HomeScreen />;
}

function HomeScreen() {
	const { isLoaded, user } = useUser();
	const { getToken } = useAuth();
	const { session } = useSession();
	const [checkoutBusy, setCheckoutBusy] = useState(false);
	const [checkoutError, setCheckoutError] = useState<string | undefined>(undefined);
	const [contactBusy, setContactBusy] = useState(false);
	const [contactError, setContactError] = useState<string | undefined>(undefined);
	const [contactSent, setContactSent] = useState(false);

	if (!isLoaded) {
		return (
			<div className="page">
				<p>Loading…</p>
			</div>
		);
	}

	const access = accessStateFromUser(user);

	return (
		<HomeView
			access={access}
			onGetAccess={() => {
				void (async () => {
					setCheckoutBusy(true);
					setCheckoutError(undefined);
					try {
						const token = await getToken();
						if (!token) {
							setCheckoutError("Sign in required.");
							return;
						}
						const result = await postCheckout(token);
						if ("checkoutUrl" in result) {
							window.location.assign(result.checkoutUrl);
							return;
						}
						if (result.code === "ALREADY_PAID") {
							await session?.reload();
							return;
						}
						setCheckoutError(result.message);
					} finally {
						setCheckoutBusy(false);
					}
				})();
			}}
			checkoutBusy={checkoutBusy}
			checkoutError={checkoutError}
			battleTunesUrl={publicHttpUrl(__BATTLE_TUNES_PUBLIC_URL__) ?? ""}
			signIn={<SignInButton />}
			signUp={<SignUpButton />}
			userMenu={access === "signed-out" ? undefined : <UserButton />}
			contact={{
				busy: contactBusy,
				error: contactError,
				sent: contactSent,
				onSubmit: async (input) => {
					setContactBusy(true);
					setContactError(undefined);
					setContactSent(false);
					try {
						const result = await postContact(input);
						if ("sent" in result) {
							setContactSent(true);
							return;
						}
						setContactError(result.message);
					} finally {
						setContactBusy(false);
					}
				},
			}}
		/>
	);
}

interface ReconcileScreenProps {
	sessionId: string;
}

function ReconcileScreen({ sessionId }: ReconcileScreenProps) {
	const { isLoaded, isSignedIn } = useUser();
	const { getToken } = useAuth();
	const { session } = useSession();
	const [message, setMessage] = useState("Confirming payment…");

	useEffect(() => {
		if (!isLoaded) {
			return;
		}
		if (!isSignedIn) {
			setMessage("Sign in to finish unlocking Battle Tunes.");
			return;
		}
		void (async () => {
			const token = await getToken();
			if (!token) {
				setMessage("Sign in to finish unlocking Battle Tunes.");
				return;
			}
			const result = await postReconcile(token, sessionId);
			if ("isPaid" in result) {
				await session?.reload();
				const url = new URL(window.location.href);
				url.searchParams.delete("session_id");
				window.history.replaceState({}, "", url.pathname);
				window.location.replace("/");
				return;
			}
			setMessage(result.message);
		})();
	}, [getToken, isLoaded, isSignedIn, session, sessionId]);

	return (
		<div className="page">
			<section className="panel">
				<h1>Payment</h1>
				<p role="status">{message}</p>
			</section>
		</div>
	);
}
