const [Map, WebTileLayer] = await $arcgis.import(["@arcgis/core/Map", "@arcgis/core/layers/WebTileLayer"] as const);
const FeatureLayer = await $arcgis.import("@arcgis/core/layers/FeatureLayer");
const locateBetweenOperator = await $arcgis.import("@arcgis/core/geometry/operators/locateBetweenOperator");