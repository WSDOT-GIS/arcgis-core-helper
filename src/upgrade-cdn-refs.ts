#!/usr/bin/env node

/**
 * Updates the CDN references in the HTML to match what is in packages.json.
 * @example
 * node --experimental-transform-types  .\tools\upgrade-cdn-refs.ts
 * @example
 * bun .\tools\upgrade-cdn-refs.ts
 */

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join, normalize, parse, relative } from "node:path";
import { argv, cwd, stderr } from "node:process";
import { JSDOM } from "jsdom";
import { parseRange } from "semver-utils";

/**
 * Represents the structure of the package.json file used in this script.
 */
interface PackageDotJson extends Record<string, Record<string, string>> {
	[key: `${string}Dependencies`]: Record<string, string>;
	dependencies: Record<string, string>;
}

/**
 * Checks that the first three arguments are strings.
 * @returns A type guard that narrows the type of the
 * arguments to [string, string, string, ...string[]] if
 * the first three arguments are strings.
 */
const firstThreeAreStrings = (
	args: string[]
): args is [string, string, string, ...string[]] =>
	args.length >= 3 &&
	[typeof args[0], typeof args[1], typeof args[2]].every(
		(type) => type === "string"
	);

// Ensure that an HTML file is provided as an argument.
// If not, print usage information and exit.
if (!firstThreeAreStrings(argv)) {
	const [exePath, scriptPath] = argv
		.slice(0, 2)
		.map((s, i) => (i > 0 ? normalize(relative(cwd(), s)) : parse(s).base));
	const usageCommand = !exePath?.match(/node/gi)
		? exePath
		: "node --experimental-transform-types";
	const message = `Usage: ${usageCommand} ${scriptPath} <html file>\n`;
	stderr.write(message);
	process.exit(1);
}
const htmlPath = argv[2];

const packageJsonPath = join(import.meta.dirname, "..", "package.json");
const packageJson: PackageDotJson = JSON.parse(
	await readFile(packageJsonPath, "utf-8")
);

const packageNames = [
	"@arcgis/core",
	"@arcgis/map-components",
	"@esri/calcite-components",
] as const;

type EsriPackageName = (typeof packageNames)[keyof typeof packageNames];

function* enumerateModules(packageDotJson: PackageDotJson) {
	const re = /Dependencies$/i;
	for (const [depPropName, obj] of Object.entries(packageDotJson)) {
		if (!re.test(depPropName)) {
			continue;
		}
		for (const [packageName, versionNumber] of Object.entries(obj)) {
			if (!packageNames.some((name) => name === packageName)) {
				continue;
			}

			yield [packageName, versionNumber] as [
				packageName: EsriPackageName,
				versionNumber: string,
			];
		}
	}
}

const flattenedDeps = new Map([...enumerateModules(packageJson)]);

/**
 * Updates the CDN references in the given HTML file to match what is in packages.json.
 * @param htmlPath The path to the HTML file. Defaults to the path of the current file.
 * @returns A promise that resolves when the HTML file has been updated.
 */
async function updateHtml(htmlPath: string) {
	async function generateSriHash(
		url: string,
		algorithm: Parameters<typeof createHash>[0] = "sha512"
	): Promise<string> {
		stderr.write(`\nGenerating SRI hash for ${url}...\n`);
		const contentResponse = await fetch(url);
		const buffer = await contentResponse.bytes();
		const hash = createHash(algorithm);
		hash.update(buffer);
		const integrity = hash.digest("base64");
		const sriHash = `${algorithm}-${integrity}`;
		stderr.write(`SRI hash for ${url}: ${sriHash}\n`);
		return sriHash;
	}

	let coreVersionString = flattenedDeps.get("@arcgis/core") ?? null;
	// Get the @arcgis/core version number, then convert to a major.minor string.
	const coreVersion =
		(coreVersionString !== null ? parseRange(coreVersionString).at(0) : null) ??
		null;
	if (coreVersion) {
		coreVersionString = coreVersion
			? `${coreVersion.major}.${coreVersion.minor}`
			: "";
	}

	// Get the @esri/calcite-components version number, then convert to a major.minor.patch string.
	const calciteVersion = flattenedDeps
		.get("@esri/calcite-components")
		?.replace(/^\D?/, "");

	console.debug("calcite version", calciteVersion);

	/**
	 * Regular expression that will match the version number of the calcite-components CDN URL.
	 */
	const calciteJsUrlRe =
		/(?<=^https:\/\/js.arcgis.com\/calcite-components\/)[\d.]+(?=\/calcite.esm.js)/i;
	/**
	 * Regular expression that will match the version number of the CDN URLs for @arcgis/core and @arcgis/map-components.
	 */
	const arcgisSdkUrlRe =
		/(?<=^https:\/\/js.arcgis.com\/(?:map-components\/)?)[\d.]+\b/i;

	/**
	 * Reads the specified HTML file and creates a JSDOM instance from its contents.
	 * @returns A promise that resolves to a JSDOM instance representing the HTML document.
	 */
	async function getJsDom() {
		stderr.write(`\nReading ${htmlPath}...\n`);
		const textBuffer = await readFile(htmlPath);
		const jsdom = new JSDOM(textBuffer);
		return jsdom;
	}

	const jsDom = await getJsDom();
	const head = jsDom.window.document.head;

	const links = head.querySelectorAll<HTMLLinkElement | HTMLScriptElement>(
		"link[rel=stylesheet],script[src]"
	);

	async function updateElementUrlVersion<
		T extends HTMLLinkElement | HTMLScriptElement =
			| HTMLLinkElement
			| HTMLScriptElement,
	>(
		element: T
	): Promise<{
		element: T;
		oldUrl: string;
		newUrl: string;
		sriHash: string;
	} | null> {
		// Get the name of the attribute of the element that contains the URL.
		const tagName = element.tagName.toUpperCase();
		const urlAttributeName =
			tagName === "SCRIPT" ? "src" : tagName === "LINK" ? "href" : null;
		// Exit if the element is not one of the expected types.
		if (!urlAttributeName) {
			return null;
		}
		// Get the URL from the element.
		const url = element.getAttribute(urlAttributeName);
		// Exit if the URL couldn't be found.
		if (!url) {
			return null;
		}

		stderr.write(`\n${tagName}[${urlAttributeName}]="${url}"]\n`);

		// Update the URL with the new version number.
		let newUrl: string | null = null;
		if (calciteJsUrlRe.test(url) && calciteVersion != null) {
			newUrl = url.replace(calciteJsUrlRe, calciteVersion);
		} else if (arcgisSdkUrlRe.test(url) && coreVersionString != null) {
			newUrl = url.replace(arcgisSdkUrlRe, coreVersionString);
		}

		// Exit if the URL couldn't be updated.
		if (!newUrl) {
			return null;
		}
		stderr.write(`\nChanging URL to "${newUrl}" from "${url}"\n`);

		const sriHash = await generateSriHash(newUrl);

		stderr.write(`SRI hash of ${newUrl}: ${sriHash}\n`);

		element.setAttribute(urlAttributeName, newUrl);
		element.setAttribute("integrity", sriHash);
		element.crossOrigin = "anonymous";

		stderr.write(element.outerHTML);

		return { element, oldUrl: url, newUrl, sriHash };
	}

	const updateElementPromises = [...links].map(updateElementUrlVersion);
	const updatedElements = (await Promise.all(updateElementPromises)).filter(
		(e) => e != null
	);

	if (updatedElements.length) {
		const outputHtml = jsDom.serialize();
		await writeFile(htmlPath, outputHtml);
	} else {
		console.error("Could not locate any elements to update.");
	}
}

await updateHtml(htmlPath);
