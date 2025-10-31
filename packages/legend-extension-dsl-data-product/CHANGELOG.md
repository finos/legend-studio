# @finos/legend-extension-dsl-data-product

## 0.0.20

### Patch Changes

- [#4593](https://github.com/finos/legend-studio/pull/4593) [`aaaa81c`](https://github.com/finos/legend-studio/commit/aaaa81c4a5d0ecfcc54f061fa95b9f6f25bef8a5) ([@yash0024](https://github.com/yash0024)) - New column for sampleValues in marketplace

## 0.0.19

## 0.0.18

### Patch Changes

- [#4590](https://github.com/finos/legend-studio/pull/4590) [`6520522`](https://github.com/finos/legend-studio/commit/652052207031fc696a0da4668672ef5bc9b7acaf) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add `getUserEntitlementEnvs` for entitlements environment and leverage for open in data cube.

- [#4589](https://github.com/finos/legend-studio/pull/4589) [`a4b7ab1`](https://github.com/finos/legend-studio/commit/a4b7ab18f06648bbd202a54a993a0938a69a19c5) ([@travisstebbins](https://github.com/travisstebbins)) - Fix fetching DataProduct subscriptions

- [#4560](https://github.com/finos/legend-studio/pull/4560) [`97e6711`](https://github.com/finos/legend-studio/commit/97e67115b3a7d99b6590bed0ca39a2451e32bab0) ([@travisstebbins](https://github.com/travisstebbins)) - Update Material UI dependencies to latest versions (@mui/material 7.3.4, @mui/system 7.3.3, @mui/lab 7.0.1-beta.18, @mui/x-date-pickers 8.14.1) and complete migration from deprecated TransitionProps/PaperProps to the new slotProps API across all Material UI Dialog, Modal, Popover, and Tooltip components. Also resolve MUI v8 date picker compatibility issues.

  Reduce Jest worker count from 100% to 2 in test:ci script to address CI memory exhaustion caused by MUI v7's increased memory footprint (documented in mui/material-ui#46908 and #45804, showing 2-5x memory increase during builds/tests).

## 0.0.17

## 0.0.16

### Patch Changes

- [#4577](https://github.com/finos/legend-studio/pull/4577) [`5c30065`](https://github.com/finos/legend-studio/commit/5c300651e63b569dbb3f569833bf70723a6c2540) ([@gs-gunjan](https://github.com/gs-gunjan)) - marketplace: add telemetry for opening datacube and powerbi from marketplace

## 0.0.15

### Patch Changes

- [#4571](https://github.com/finos/legend-studio/pull/4571) [`7ab2dde`](https://github.com/finos/legend-studio/commit/7ab2dde288b8ca18494e5c819354518e0554ca2c) ([@jackp5150](https://github.com/jackp5150)) - Added terminal request flow to UI

## 0.0.14

## 0.0.13

### Patch Changes

- [#4521](https://github.com/finos/legend-studio/pull/4521) [`289f34f`](https://github.com/finos/legend-studio/commit/289f34f9aad0b36fa3fad3cf832642bdbf4a590f) ([@jackp5150](https://github.com/jackp5150)) - Added table and access sections to terminal UI

- [#4562](https://github.com/finos/legend-studio/pull/4562) [`c6471ce`](https://github.com/finos/legend-studio/commit/c6471ceb4d647d0ded577e610e07f4d428acd440) ([@TharunRajeev](https://github.com/TharunRajeev)) - Datacube navigation for AdHoc Dataproducts from marketplace.

## 0.0.12

### Patch Changes

- [#4551](https://github.com/finos/legend-studio/pull/4551) [`69bc7f2`](https://github.com/finos/legend-studio/commit/69bc7f270080b56414da6525aca51b61a2a83cbf) ([@travisstebbins](https://github.com/travisstebbins)) - Use DataProduct artifact to display access point column names/types

## 0.0.11

## 0.0.10

## 0.0.9

### Patch Changes

- [#4520](https://github.com/finos/legend-studio/pull/4520) [`23ffa90`](https://github.com/finos/legend-studio/commit/23ffa90163194793f5c8e8ce422ac4b07fde7951) ([@TharunRajeev](https://github.com/TharunRajeev)) - Open Data Product Access Point in Data Cube

- [#4525](https://github.com/finos/legend-studio/pull/4525) [`2c5d267`](https://github.com/finos/legend-studio/commit/2c5d267f7bd9ca9d21278c6f51872900f7301f6e) ([@TharunRajeev](https://github.com/TharunRajeev)) - Redirection to Power BI from marketplace.

## 0.0.8

## 0.0.7

### Patch Changes

- [#4488](https://github.com/finos/legend-studio/pull/4488) [`bc14406`](https://github.com/finos/legend-studio/commit/bc144069d63896b9ca6a5fabecaad31df8545e3c) ([@travisstebbins](https://github.com/travisstebbins)) - Add Data Product preview to DataProductEditor

## 0.0.6

## 0.0.5

### Patch Changes

- [#4500](https://github.com/finos/legend-studio/pull/4500) [`fed96f8`](https://github.com/finos/legend-studio/commit/fed96f83fd0cd99f4e90e798667145ec6c867173) ([@travisstebbins](https://github.com/travisstebbins)) - Fix access point table height

## 0.0.4

### Patch Changes

- [#4490](https://github.com/finos/legend-studio/pull/4490) [`4db55db`](https://github.com/finos/legend-studio/commit/4db55db273f7d2f0e670a90093485509955aced2) ([@yash0024](https://github.com/yash0024)) - Add entitlement analytics: creating a contract or subscription

## 0.0.3

### Patch Changes

- [#4487](https://github.com/finos/legend-studio/pull/4487) [`5f218cc`](https://github.com/finos/legend-studio/commit/5f218ccdbb026912e0e2239b7ecfe2824a12b326) ([@jackp5150](https://github.com/jackp5150)) - Added producer requests to data products

- [#4483](https://github.com/finos/legend-studio/pull/4483) [`7200acf`](https://github.com/finos/legend-studio/commit/7200acf72171e053ff3b6438b4b8ed95756ad465) ([@TharunRajeev](https://github.com/TharunRajeev)) - Modified UI for data product screen in marketplace to support new tabs.

## 0.0.2

### Patch Changes

- [#4457](https://github.com/finos/legend-studio/pull/4457) [`4a26d6b`](https://github.com/finos/legend-studio/commit/4a26d6b85a00880801c5bcb089eee632bd8e2aae) ([@travisstebbins](https://github.com/travisstebbins)) - Create legend-extension-dsl-data-product package"
