# Enhanced type definitions for @arcgis/core

## setup-arcgis-import module

Importing this module will add the `$arcgis.import` function to the global scope if it is not already defined. (If it is already defined, it is left unchanged.)

Since the `$arcgis.import` function is only available when loading the ArcGIS Maps SDK for JavaScript from the CDN, this presents a problem when writing unit tests, since they are not web pages and thus are not loading the SDK from the CDN.
(Ideally, unit tests would not be loading internet resources, so will import modules locally.)

To add `$arcgis.import` to the global scope for non-browser environments, you simply need to import the module as shown below.

```typescript 
import "@wsdot/types-arcgis-core-adapter";
```


## Type Definitions

Provides better TypeScript support for the global `$arcgis.import` function, than the type definition from the `@arcgis/core-adapter` module.

<details>
<summary>More detailed explanation</summary>

Allows you to do this in TypeScript:

```typescript
const [Map, WebTileLayer] = await $arcgis.import(["@arcgis/core/Map", "@arcgis/core/layers/WebTileLayer"] as const);
const FeatureLayer = await $arcgis.import("@arcgis/core/layers/FeatureLayer");
const locateBetweenOperator = await $arcgis.import("@arcgis/core/geometry/operators/locateBetweenOperator");
```

Instead of this

```typescript
const [EsriMap, WebTileLayer] = await window.$arcgis.import<
  [typeof __esri.Map, typeof __esri.WebTileLayer]
>(["@arcgis/core/Map", "@arcgis/core/layers/WebTileLayer"] as const);
const FeatureLayer = await window.$arcgis.import<typeof __esri.FeatureLayer>(
  "@arcgis/core/layers/FeatureLayer",
);
const locateBetweenOperator = await window.$arcgis.import<
  typeof __esri.locateBetweenOperator
>("@arcgis/core/geometry/operators/locateBetweenOperator");
```

</details>

## arcgis-cdn-dts CLI tool

If for some reason you don't want to reference the types from this package and instead want to have them locally, you can use the arcgis-cdn-dts command to generate the type definitions.

```shell
bunx arcgis-cdn-dts
```