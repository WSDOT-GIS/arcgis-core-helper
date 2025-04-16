/**
 * This script generates the `index.d.ts` file.
 */

import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stderr } from "node:process";

const baseDir = "node_modules/@arcgis/core";
const outputFile = "index.d.ts";

// Helper function: Check if a file has a default export.
// This is a heuristic that looks for "export default" in the file content.
function hasDefaultExport(filePath: string) {
	try {
		const content = readFileSync(filePath, "utf8");
		// A basic check: look for "export default"
		return content.includes("export default");
	} catch (error) {
		console.error(`Error reading ${filePath}:`, error);
		return false;
	}
}

/**
 * Recursively walks the @arcgis/core module tree to find all .d.ts files
 * (except for index.d.ts) and returns a list of objects with the following
 * properties:
 *
 * - modulePath: the path to the module, relative to the @arcgis/core
 *   root, with '/' as the path separator.
 * - fullEntryPath: the absolute path to the module file.
 *
 * @param currentDir - the current directory to start searching from.
 * Defaults to the root of the @arcgis/core module tree.
 * @returns an array of objects with the module path and full entry path.
 */
function getAllDtsModules(
	currentDir = "",
): { modulePath: string; fullEntryPath: string }[] {
	const fullPath = join(baseDir, currentDir);
	const entries = readdirSync(fullPath);
	let modules: { modulePath: string; fullEntryPath: string }[] = [];

	// Iterate over each entry in the current directory
	for (const entry of entries) {
		const entryPath = join(currentDir, entry);
		const fullEntryPath = join(baseDir, entryPath);
		const stat = statSync(fullEntryPath);

		// If the entry is a directory, recurse into it
		if (stat.isDirectory()) {
			modules = modules.concat(getAllDtsModules(entryPath));
		}
		// If the entry is a .d.ts file (excluding index.d.ts), add it to the modules list
		else if (entry.endsWith(".d.ts") && entry !== "index.d.ts") {
			const modulePath = entryPath.replace(/\.d\.ts$/, "").replace(/\\/g, "/");
			modules.push({ modulePath, fullEntryPath });
		}
	}

	return modules;
}

const modules = getAllDtsModules();

/**
 * A generator that yields lines of code that define the
 * properties of the ArcGISModuleMap type.
 *
 * @param {Array<{modulePath: string, fullEntryPath: string}>} modules
 *   - the list of modules produced by getAllDtsModules
 * @yields {string}
 *   - individual lines of code that define the properties of
 *     the ArcGISModuleMap type.
 */
function* enumerateModules(modules: ReturnType<typeof getAllDtsModules>) {
	for (const { modulePath, fullEntryPath } of modules) {
		if (hasDefaultExport(fullEntryPath)) {
			yield `\t"@arcgis/core/${modulePath}": (typeof import("@arcgis/core/${modulePath}"))["default"];`;
			yield `\t"@arcgis/core/${modulePath}.js": (typeof import("@arcgis/core/${modulePath}.js"))["default"];`;
		} else {
			yield `\t"@arcgis/core/${modulePath}": typeof import("@arcgis/core/${modulePath}");`;
			yield `\t"@arcgis/core/${modulePath}.js": typeof import("@arcgis/core/${modulePath}.js");`;
		}
	}
}

const lines = [
	"export type ArcGISModuleMap = {",
	...enumerateModules(modules),
	"};",
	String.raw`
declare global {
	const $arcgis: {
		/**
		 * Imports an @arcgis/core module from the CDN.
		 * @see {@link https://developers.arcgis.com/javascript/latest/get-started-cdn/#module-loading-via-cdn}
		 * @param moduleName - Name of the @arcgis/core module you want to import.
		 * @param forceESM - Force ESM.
		 */
		import<T extends keyof ArcGISModuleMap>(
			moduleName: T, forceESM?: boolean
		): Promise<ArcGISModuleMap[T]>;
	
		/**
		 * Imports an @arcgis/core module from the CDN.
		 * @see {@link https://developers.arcgis.com/javascript/latest/get-started-cdn/#module-loading-via-cdn}
		 * @param moduleNames - Names of the @arcgis/core module you want to import.
		 * @param forceESM - Force ESM.
		 */
		import<T extends readonly (keyof ArcGISModuleMap)[]>(
			moduleNames: T, forceESM?: boolean
		): Promise<{ [K in keyof T]: ArcGISModuleMap[T[K]] }>;
	};

	interface Window {
		$arcgis: typeof $arcgis;
	}
}
`,
];

writeFileSync(outputFile, lines.join("\n"), "utf-8");

stderr.write(`\n✅ Generated ${outputFile} with ${modules.length} entries.`);
