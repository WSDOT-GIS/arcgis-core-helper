/**
 * This script generated the ArcGISModuleMap type
 * that was then copied to arcgis-extra.d.ts
 */

import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const baseDir = "node_modules/@arcgis/core";
const outputFile = "arcgis-module-map.d.ts";

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
 * @param {string} currentDir - the current directory to start searching
 *   from. Defaults to the root of the @arcgis/core module tree.
 * @return {Array<{modulePath: string, fullEntryPath: string}>}
 */
function getAllDtsModules(currentDir = ""): { modulePath: string; fullEntryPath: string; }[] {
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

console.table(modules);

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
      yield `  "@arcgis/core/${modulePath}": (typeof import("@arcgis/core/${modulePath}"))["default"];`;
      yield `  "@arcgis/core/${modulePath}.js": (typeof import("@arcgis/core/${modulePath}.js"))["default"];`;
    } else {
      yield `  "@arcgis/core/${modulePath}": typeof import("@arcgis/core/${modulePath}");`;
      yield `  "@arcgis/core/${modulePath}.js": typeof import("@arcgis/core/${modulePath}.js");`;
    }
  }
}

const lines = [
	"export type ArcGISModuleMap = {",
	...enumerateModules(modules),
	"};",
];

writeFileSync(outputFile, lines.join("\n"), "utf-8");

console.log(`✅ Generated ${outputFile} with ${modules.length} entries.`);
