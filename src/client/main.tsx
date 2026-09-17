import { ClerkProvider } from "@clerk/clerk-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./styles.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Missing #root element.");
}

createRoot(rootElement).render(
	<StrictMode>
		<ClerkProvider publishableKey={__CLERK_PUBLISHABLE_KEY__}>
			<App />
		</ClerkProvider>
	</StrictMode>,
);
