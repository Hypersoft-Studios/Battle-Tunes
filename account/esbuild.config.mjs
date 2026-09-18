import * as esbuild from "esbuild";
import { cpSync, mkdirSync } from "node:fs";

mkdirSync("dist/client", { recursive: true });
cpSync("client/index.html", "dist/client/index.html");

const client = await esbuild.context({
	entryPoints: ["client/main.tsx"],
	bundle: true,
	outdir: "dist/client",
	format: "esm",
	splitting: true,
	minify: true,
	sourcemap: true,
	jsx: "automatic",
});

const server = await esbuild.context({
	entryPoints: ["server/main.ts"],
	bundle: true,
	platform: "node",
	format: "esm",
	outfile: "dist/server/main.js",
	packages: "external",
	sourcemap: true,
});

if (process.argv.includes("--watch")) {
	await client.watch();
	await server.watch();
} else {
	await client.rebuild();
	await server.rebuild();
	await client.dispose();
	await server.dispose();
}
