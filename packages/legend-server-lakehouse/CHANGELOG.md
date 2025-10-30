# @finos/legend-server-lakehouse

## 0.3.9

### Patch Changes

- [#4571](https://github.com/finos/legend-studio/pull/4571) [`7ab2dde`](https://github.com/finos/legend-studio/commit/7ab2dde288b8ca18494e5c819354518e0554ca2c) ([@jackp5150](https://github.com/jackp5150)) - Added serialization for terminals

## 0.3.8

## 0.3.7

### Patch Changes

- [#4551](https://github.com/finos/legend-studio/pull/4551) [`69bc7f2`](https://github.com/finos/legend-studio/commit/69bc7f270080b56414da6525aca51b61a2a83cbf) ([@travisstebbins](https://github.com/travisstebbins)) - Remove unused getDeployedIngestDefinitions function

## 0.3.6

## 0.3.5

## 0.3.4

### Patch Changes

- [#4515](https://github.com/finos/legend-studio/pull/4515) [`26d6a5d`](https://github.com/finos/legend-studio/commit/26d6a5d44d3d61efca85d107c34f6c2bdb97e6f1) ([@gs-gunjan](https://github.com/gs-gunjan)) - datacube: retreive data products from lakehouse

## 0.3.3

## 0.3.2

## 0.3.1

## 0.3.0

### Minor Changes

- [#4424](https://github.com/finos/legend-studio/pull/4424) [`6bd1936`](https://github.com/finos/legend-studio/commit/6bd1936f17d07ff0c09e3e54f350713256b2ce71) ([@gs-gunjan](https://github.com/gs-gunjan)) - datacube: support iceberg querying flow for lakehouse producers
  Description:
  If a lakehouse ingested tabled is iceberg enabled, we allow querying the table via duckdb using iceberg extension
  Initially we fetch all the data for a particular dataset from a catalog and cache the data. Subsequent operations happen on top of the stored cache.

## 0.2.8

### Patch Changes

- [#4471](https://github.com/finos/legend-studio/pull/4471) [`acc1d25`](https://github.com/finos/legend-studio/commit/acc1d25daa0b3e76ca9ca09e46332faeaa863c43) ([@gs-gunjan](https://github.com/gs-gunjan)) - datacube: fixing incompatible protocol for ingest from datacube

## 0.2.7

## 0.2.6

## 0.2.5

## 0.2.4

## 0.2.3

## 0.2.2

## 0.2.1

## 0.2.0

### Minor Changes

- [#4378](https://github.com/finos/legend-studio/pull/4378) [`e730da2`](https://github.com/finos/legend-studio/commit/e730da2909e9bdc9129322f16515ec4413d0fa1a) ([@gs-gunjan](https://github.com/gs-gunjan)) - datacube: initial support for lakehouse consumer

## 0.1.6

## 0.1.5

## 0.1.4

## 0.1.3

## 0.1.2

## 0.1.1

## 0.1.0

### Minor Changes

- [#4318](https://github.com/finos/legend-studio/pull/4318) [`7fb8eaf`](https://github.com/finos/legend-studio/commit/7fb8eafffc244226762c5e63ed0f4791712a565b) ([@gs-gunjan](https://github.com/gs-gunjan)) - datacube: support ingest definition data cube source

## 0.0.19

## 0.0.18

## 0.0.17

## 0.0.16

## 0.0.15

## 0.0.14

## 0.0.13

## 0.0.12

## 0.0.11

## 0.0.10

## 0.0.9

## 0.0.8

## 0.0.7

## 0.0.6

## 0.0.5

## 0.0.4

## 0.0.3

### Patch Changes

- [#4205](https://github.com/finos/legend-studio/pull/4205) [`ca74ba8`](https://github.com/finos/legend-studio/commit/ca74ba8c96a7cb4bf0b47cff520f68db09fd10ba) ([@travisstebbins](https://github.com/travisstebbins)) - Differentiate ingest environment classifications on Lakehouse home

## 0.0.2

### Patch Changes

- [#4196](https://github.com/finos/legend-studio/pull/4196) [`0e087a1`](https://github.com/finos/legend-studio/commit/0e087a1becf4288581554e4ac919327a9fc73fa4) ([@travisstebbins](https://github.com/travisstebbins)) - Improve Lakehouse data product viewer

- [#4193](https://github.com/finos/legend-studio/pull/4193) [`57d8cc9`](https://github.com/finos/legend-studio/commit/57d8cc9ac1d7a07334c90415350bd1d7a5ab7e6a) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Create workspace to hold all lakehouse calls
