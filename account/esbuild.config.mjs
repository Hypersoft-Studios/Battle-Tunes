import * as esbuild from "esbuild";
import { cp, mkdir } from "node:fs/promises";

await mkdir("dist/client", { recursive: true });
await cp("client/index.html", "dist/client/index.html");

await esbuild.build({
	entryPoints: ["client/main.tsx"],
	bundle: true,
	outdir: "dist/client",
	format: "esm",
	splitting: true,
	minify: true,
	sourcemap: true,
	jsx: "automatic",
});
