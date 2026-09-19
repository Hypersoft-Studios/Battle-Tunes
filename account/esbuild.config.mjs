import * as esbuild from "esbuild";
import { cp as copyFile, mkdir as makeDirectory } from "node:fs/promises";

await makeDirectory("dist/client", { recursive: true });
await copyFile("client/index.html", "dist/client/index.html");

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
