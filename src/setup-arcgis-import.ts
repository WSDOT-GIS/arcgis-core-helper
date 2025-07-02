/**
 * @module setup-arcgis-import
 * @description Importing this module will add the `$arcgis.import` function to the global scope
 * if it is not already defined. (If it is already defined, it is left unchanged.)
 *
 * Since the `$arcgis.import` function is only available when loading the
 * ArcGIS Maps SDK for JavaScript from the CDN, this presents a problem when writing
 * unit tests, since they are not web pages and thus are not loading the SDK from the CDN.
 * (Ideally, unit tests would not be loading internet resources, so will import modules locally.)
 * @example
 * import "@wsdot/types-arcgis-core-adapter";
 */

import type { ArcGISModuleMap } from ".";

/**
 * Imports ArcGIS modules dynamically.
 */
export const importArcGisModules =
	// If $arcgis is already defined, just return $arcgis.import.
	// Otherwise, define a new import function.
	// This is useful for testing and ensures that the import function is always available.
	typeof $arcgis !== "undefined"
		? $arcgis.import
		: async <K extends keyof ArcGISModuleMap>(
				moduleNames: K | readonly K[]
			) => {
				if (typeof moduleNames === "string") {
					const m = (await import(
						moduleNames
					)) as ArcGISModuleMap[typeof moduleNames];
					if (m.default != null) {
						return m.default;
					}
					return m;
				}

				const results = await Promise.all(
					moduleNames.map(async (m): Promise<ArcGISModuleMap[typeof m]> => {
						const importResult = (await import(m)) as
							| ArcGISModuleMap[typeof m]
							| { default?: ArcGISModuleMap[typeof m] };
						if (importResult.default != null) {
							return importResult.default;
						}
						return importResult;
					})
				);
				return results;
			};

// If $arcgis is not defined, define it globally.
// This allows $arcgis.import to work in non-browser contexts.
if (!("$arcgis" in global)) {
	// @ts-expect-error
	global.$arcgis = {
		import: importArcGisModules,
	};
}
