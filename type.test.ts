import { describe, expect, test } from "bun:test";
import "./setup-arcgis-import.js";

describe("Import ArcGIS Modules", () => {
	test("$arcgis.import should be defined", () => {
		expect($arcgis).toBeDefined();
		expect(typeof $arcgis.import).toBe("function");
	});
	test("import multiple", async () => {
		const [EsriMap, WebTileLayer] = await $arcgis.import([
			"@arcgis/core/Map",
			"@arcgis/core/layers/WebTileLayer",
		] as const);
		expect(EsriMap.prototype.declaredClass).toStrictEqual("esri.Map");
		expect(WebTileLayer.prototype.declaredClass).toStrictEqual(
			"esri.layers.WebTileLayer"
		);
	});
	test("import single", async () => {
		$arcgis.import("@arcgis/core/layers/FeatureLayer").then((FeatureLayer) => {
			expect(FeatureLayer.prototype.declaredClass).toStrictEqual(
				"esri.layers.FeatureLayer"
			);
		});
		$arcgis
			.import("@arcgis/core/geometry/operators/locateBetweenOperator")
			.then((locateBetweenOperator) => {
				expect(locateBetweenOperator.executeMany).toBeFunction();
				expect(locateBetweenOperator.executeMany).toBeFunction();
			});
	});
});
