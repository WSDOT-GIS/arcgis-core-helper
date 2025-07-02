#!/usr/bin/env bun

import { type BuildConfig, build } from "bun";

const configs: BuildConfig[] = [
	{
		target: "node",
		entrypoints: ["tools/generate-dts.ts"],
		outdir: "bin",
		minify: true,
	},
	{
		entrypoints: ["src/setup-arcgis-import.ts"],
		outdir: "dist",
		minify: true,
		target: "browser",
		sourcemap: "linked",
	},
];

const buildPromises = configs.map(build);

await Promise.all(buildPromises);
