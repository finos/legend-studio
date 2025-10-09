# @finos/legend-application-data-cube

## 0.7.5

## 0.7.4

### Patch Changes

- [#4515](https://github.com/finos/legend-studio/pull/4515) [`26d6a5d`](https://github.com/finos/legend-studio/commit/26d6a5d44d3d61efca85d107c34f6c2bdb97e6f1) ([@gs-gunjan](https://github.com/gs-gunjan)) - datacube: retreive data products from lakehouse

## 0.7.3

## 0.7.2

### Patch Changes

- [#4504](https://github.com/finos/legend-studio/pull/4504) [`78867d0`](https://github.com/finos/legend-studio/commit/78867d05385048696fdc3411fa0dcf25aa2021fd) ([@gs-gunjan](https://github.com/gs-gunjan)) - datacube: update duckdb version

## 0.7.1

## 0.7.0

### Minor Changes

- [#4424](https://github.com/finos/legend-studio/pull/4424) [`6bd1936`](https://github.com/finos/legend-studio/commit/6bd1936f17d07ff0c09e3e54f350713256b2ce71) ([@gs-gunjan](https://github.com/gs-gunjan)) - datacube: support iceberg querying flow for lakehouse producers
  Description:
  If a lakehouse ingested tabled is iceberg enabled, we allow querying the table via duckdb using iceberg extension
  Initially we fetch all the data for a particular dataset from a catalog and cache the data. Subsequent operations happen on top of the stored cache.

### Patch Changes

- [#4484](https://github.com/finos/legend-studio/pull/4484) [`7d1ca7d`](https://github.com/finos/legend-studio/commit/7d1ca7d2f20e5ca3266e3b31999f05c7dd8fdfa0) ([@gs-gunjan](https://github.com/gs-gunjan)) - datacube: optimize and cleanup lakehouse consumer flow
  Use only production type dataproducts

## 0.6.15

### Patch Changes

- [#4471](https://github.com/finos/legend-studio/pull/4471) [`acc1d25`](https://github.com/finos/legend-studio/commit/acc1d25daa0b3e76ca9ca09e46332faeaa863c43) ([@gs-gunjan](https://github.com/gs-gunjan)) - datacube: fixing incompatible protocol for ingest from datacube

## 0.6.14

### Patch Changes

- [#4460](https://github.com/finos/legend-studio/pull/4460) [`2450039`](https://github.com/finos/legend-studio/commit/2450039957b09da7b2f253a6950ae4c944a84712) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Added navigation to Marketplace from DataCube

## 0.6.13

## 0.6.12

## 0.6.11

## 0.6.10

## 0.6.9

### Patch Changes

- [#4423](https://github.com/finos/legend-studio/pull/4423) [`115719d`](https://github.com/finos/legend-studio/commit/115719dcd64d1caaa8b81b880873a20511071ea5) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - handle precise primitives on conversion to duckdb

## 0.6.8

### Patch Changes

- [#4417](https://github.com/finos/legend-studio/pull/4417) [`9b5e036`](https://github.com/finos/legend-studio/commit/9b5e03668221677359603cd373ad6d3137b22319) ([@gs-gunjan](https://github.com/gs-gunjan)) - datacube: adding a selection for environments for data products

## 0.6.7

### Patch Changes

- [#4415](https://github.com/finos/legend-studio/pull/4415) [`11fc2ce`](https://github.com/finos/legend-studio/commit/11fc2ceb85cab2276bc241b130466efd9012400c) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add `dataProductAccessor`

## 0.6.6

### Patch Changes

- [#4412](https://github.com/finos/legend-studio/pull/4412) [`0647e9d`](https://github.com/finos/legend-studio/commit/0647e9d2f9f028f2474efcd75829cd94773e56a1) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - change lakehouse consumer query to query directly against access point accessor

## 0.6.5

## 0.6.4

## 0.6.3

## 0.6.2

### Patch Changes

- [#4389](https://github.com/finos/legend-studio/pull/4389) [`cc714e8`](https://github.com/finos/legend-studio/commit/cc714e8964ac6e9a25ae9b487264ceab7e2b25c4) ([@gs-gunjan](https://github.com/gs-gunjan)) - datacube: improve feedback for loading data products

## 0.6.1

### Patch Changes

- [#4383](https://github.com/finos/legend-studio/pull/4383) [`ab10be0`](https://github.com/finos/legend-studio/commit/ab10be03050d05efc4c34458c0cd605a3c875fa6) ([@gs-gunjan](https://github.com/gs-gunjan)) - datacube: fixing building source query for dataproduct functions

## 0.6.0

### Minor Changes

- [#4378](https://github.com/finos/legend-studio/pull/4378) [`e730da2`](https://github.com/finos/legend-studio/commit/e730da2909e9bdc9129322f16515ec4413d0fa1a) ([@gs-gunjan](https://github.com/gs-gunjan)) - datacube: initial support for lakehouse consumer

## 0.5.6

## 0.5.5

## 0.5.4

## 0.5.3

### Patch Changes

- [#4346](https://github.com/finos/legend-studio/pull/4346) [`65fb1fc`](https://github.com/finos/legend-studio/commit/65fb1fc8e47de44ea0f11e10a9a9f7d169bba4cd) ([@gs-gunjan](https://github.com/gs-gunjan)) - datacube: rename source

## 0.5.2

### Patch Changes

- [#4333](https://github.com/finos/legend-studio/pull/4333) [`a2115ad`](https://github.com/finos/legend-studio/commit/a2115ad19308b7ecbf541a615d2c569bc8f88a2e) ([@gs-gunjan](https://github.com/gs-gunjan)) - datacube: smoothen transitions

## 0.5.1

### Patch Changes

- [#4330](https://github.com/finos/legend-studio/pull/4330) [`fc4e7b0`](https://github.com/finos/legend-studio/commit/fc4e7b0a2a844a6518490e867e0e53c449827425) ([@travisstebbins](https://github.com/travisstebbins)) - Add sanitizeParametersInsteadOfUrl parameter to getQueryParameterValue function

- [#4331](https://github.com/finos/legend-studio/pull/4331) [`4d3ad0c`](https://github.com/finos/legend-studio/commit/4d3ad0c2f87df4a9320813790870d0a812256c22) ([@gs-gunjan](https://github.com/gs-gunjan)) - datacube: saving ingest definition datacube source grid

## 0.5.0

### Minor Changes

- [#4318](https://github.com/finos/legend-studio/pull/4318) [`7fb8eaf`](https://github.com/finos/legend-studio/commit/7fb8eafffc244226762c5e63ed0f4791712a565b) ([@gs-gunjan](https://github.com/gs-gunjan)) - datacube: support ingest definition data cube source

## 0.4.8

## 0.4.7

## 0.4.6

## 0.4.5

## 0.4.4

### Patch Changes

- [#4280](https://github.com/finos/legend-studio/pull/4280) [`057295d`](https://github.com/finos/legend-studio/commit/057295d4b812c7c8a450e37c5d1c04c7d9010b23) ([@gs-gunjan](https://github.com/gs-gunjan)) - datacube: fix processing lambda relation types for query with params

- [#4285](https://github.com/finos/legend-studio/pull/4285) [`da85ede`](https://github.com/finos/legend-studio/commit/da85ede3afb3e8bdc4b2c3f79c1a89353cea3ec6) ([@travisstebbins](https://github.com/travisstebbins)) - added tests for freeformtdsexpression DataCubeSrc

## 0.4.3

## 0.4.2

### Patch Changes

- [#4281](https://github.com/finos/legend-studio/pull/4281) [`d6b6200`](https://github.com/finos/legend-studio/commit/d6b6200603201cf635f5b5d5afb9254e2e52f3e5) ([@gs-gunjan](https://github.com/gs-gunjan)) - datacube: smoothen editing flow of query

## 0.4.1

## 0.4.0

### Minor Changes

- [#4271](https://github.com/finos/legend-studio/pull/4271) [`cd36958`](https://github.com/finos/legend-studio/commit/cd369589501f247f48e7dc59689da4ef184cc0fe) ([@gs-gunjan](https://github.com/gs-gunjan)) - datacube: support editor for fixing initial lambda

### Patch Changes

- [#4266](https://github.com/finos/legend-studio/pull/4266) [`40a9c9b`](https://github.com/finos/legend-studio/commit/40a9c9b034d7f45eac38ee36192adc745aa61675) ([@gs-gunjan](https://github.com/gs-gunjan)) - datacube: exporting full data csv

- [#4261](https://github.com/finos/legend-studio/pull/4261) [`c2d9c89`](https://github.com/finos/legend-studio/commit/c2d9c89b7dcb7833875b822fddb2ad1852be4b4a) ([@kelly-thai](https://github.com/kelly-thai)) - Added a boolean variable that will create a different case for sourcedata extraction and replacement of encoded characters.
  Updated the changeset again

## 0.3.60

## 0.3.59

## 0.3.58

## 0.3.57

## 0.3.56

## 0.3.55

## 0.3.54

## 0.3.53

## 0.3.52

## 0.3.51

## 0.3.50

## 0.3.49

### Patch Changes

- [#4196](https://github.com/finos/legend-studio/pull/4196) [`0e087a1`](https://github.com/finos/legend-studio/commit/0e087a1becf4288581554e4ac919327a9fc73fa4) ([@travisstebbins](https://github.com/travisstebbins)) - Rename getV1_ValueSpecificationStringValue to V1_stringifyValueSpecification

## 0.3.48

## 0.3.47

## 0.3.46

## 0.3.45

## 0.3.44

## 0.3.43

## 0.3.42

## 0.3.41

## 0.3.40

## 0.3.39

## 0.3.38

## 0.3.37

## 0.3.36

## 0.3.35

## 0.3.34

## 0.3.33

## 0.3.32

## 0.3.31

## 0.3.30

## 0.3.29

### Patch Changes

- [#4073](https://github.com/finos/legend-studio/pull/4073) [`36b847e`](https://github.com/finos/legend-studio/commit/36b847e74ec81a3d8d923127d893f183446fcb4e) ([@gs-gunjan](https://github.com/gs-gunjan)) - datacube: saving dimensional grid and providing zoom out functionality

## 0.3.28

### Patch Changes

- [#3988](https://github.com/finos/legend-studio/pull/3988) [`3b854bc`](https://github.com/finos/legend-studio/commit/3b854bc217f53b8f3c300e499e1bb058f144ed74) ([@gs-gunjan](https://github.com/gs-gunjan)) - Implementing multi-dimensional grid mode (essbase view) in DataCube

## 0.3.27

## 0.3.26

## 0.3.25

## 0.3.24

## 0.3.23

## 0.3.22

## 0.3.21

### Patch Changes

- [#4024](https://github.com/finos/legend-studio/pull/4024) [`4545656`](https://github.com/finos/legend-studio/commit/4545656bb3887ccd9a1a11250c6bcc514c169978) ([@travisstebbins](https://github.com/travisstebbins)) - Increase timeout on test assertion

## 0.3.20

## 0.3.19

## 0.3.18

## 0.3.17

## 0.3.16

### Patch Changes

- [#3989](https://github.com/finos/legend-studio/pull/3989) [`5d1d97e`](https://github.com/finos/legend-studio/commit/5d1d97e845c51e559708677563bdad4024952ffc) ([@travisstebbins](https://github.com/travisstebbins)) - Fix bug with fetching enum values from project dependency

## 0.3.15

### Patch Changes

- [#3982](https://github.com/finos/legend-studio/pull/3982) [`dfdb723`](https://github.com/finos/legend-studio/commit/dfdb723e3f4f574ba12abfdeccd39871cb3ca584) ([@kelly-thai](https://github.com/kelly-thai)) - Rename Adhoc Queries to Freeform TDS Expression

- [#3980](https://github.com/finos/legend-studio/pull/3980) [`e482faa`](https://github.com/finos/legend-studio/commit/e482faabb5494cb7e024e24e6a60aae2f3cc3d30) ([@travisstebbins](https://github.com/travisstebbins)) - Add support for editing parameters with LegendQueryDataCubeSource queries

## 0.3.14

## 0.3.13

## 0.3.12

### Patch Changes

- [#3972](https://github.com/finos/legend-studio/pull/3972) [`419298f`](https://github.com/finos/legend-studio/commit/419298f76a6921b5a8a178b5f3bd68febef36c30) ([@yash0024](https://github.com/yash0024)) - Add more Analytics for DataCube

## 0.3.11

## 0.3.10

### Patch Changes

- [#3962](https://github.com/finos/legend-studio/pull/3962) [`79dd0aa`](https://github.com/finos/legend-studio/commit/79dd0aa10b4a84820759347f6e51def58aa57ffb) ([@yash0024](https://github.com/yash0024)) - Add Analytics for DataCube

## 0.3.9

### Patch Changes

- [#3906](https://github.com/finos/legend-studio/pull/3906) [`507fdaa`](https://github.com/finos/legend-studio/commit/507fdaa70eaa32e8eea04aa87403fabab6f58a5e) ([@travisstebbins](https://github.com/travisstebbins)) - Automatically convert TDS to relation protocol in hosted datacube

## 0.3.8

## 0.3.7

## 0.3.6

### Patch Changes

- [#3947](https://github.com/finos/legend-studio/pull/3947) [`8c96f99`](https://github.com/finos/legend-studio/commit/8c96f9985b3c89c17c64343cfb6d938417650b8d) ([@kelly-thai](https://github.com/kelly-thai)) - Adding support for Ad Hoc queryes as a DataCubeSource type

- [#3945](https://github.com/finos/legend-studio/pull/3945) [`00eaeaa`](https://github.com/finos/legend-studio/commit/00eaeaa875f1b0e431c75ace6d582284a0ff04c6) ([@travisstebbins](https://github.com/travisstebbins)) - Add support for query lambdas with multiple expressions in Datacube

## 0.3.5

## 0.3.4

### Patch Changes

- [#3927](https://github.com/finos/legend-studio/pull/3927) [`cc87652`](https://github.com/finos/legend-studio/commit/cc8765297e638e710024c05be4cc9b7d436705dc) ([@gs-gunjan](https://github.com/gs-gunjan)) - Fixing date handling for result data from Duckdb

## 0.3.3

### Patch Changes

- [#3916](https://github.com/finos/legend-studio/pull/3916) [`f7432e6`](https://github.com/finos/legend-studio/commit/f7432e620874b1253eef783f9ce8c1c6bbcf83cd) ([@travisstebbins](https://github.com/travisstebbins)) - Add basic DataCube UI integration tests

- [#3903](https://github.com/finos/legend-studio/pull/3903) [`dc54b97`](https://github.com/finos/legend-studio/commit/dc54b97ed08bbb289f5645343ff1f1c4dfece209) ([@gs-gunjan](https://github.com/gs-gunjan)) - Enabled saving and loading local file source.

- [#3919](https://github.com/finos/legend-studio/pull/3919) [`4559d62`](https://github.com/finos/legend-studio/commit/4559d62a8eec7900490ad03df1fe5e399101c7ff) ([@gs-gunjan](https://github.com/gs-gunjan)) - Build cache tables schema using tds information

- [#3915](https://github.com/finos/legend-studio/pull/3915) [`99e8b9b`](https://github.com/finos/legend-studio/commit/99e8b9b9f181bc16a21fee19c593660ed0fb7f14) ([@travisstebbins](https://github.com/travisstebbins)) - Support parameters that use functions in hosted DataCube

- [#3918](https://github.com/finos/legend-studio/pull/3918) [`2cf0c63`](https://github.com/finos/legend-studio/commit/2cf0c63bd735eb720197b6c54dc2898237b98a26) ([@travisstebbins](https://github.com/travisstebbins)) - Add release notes for DataCube

## 0.3.2

### Patch Changes

- [#3907](https://github.com/finos/legend-studio/pull/3907) [`59983e2`](https://github.com/finos/legend-studio/commit/59983e2f8065207e82d7329a2879b8c4d5773ffd) ([@kelly-thai](https://github.com/kelly-thai)) - Add User Defined Functions as a supported DataCube Source

## 0.3.1

## 0.3.0

## 0.2.8

### Patch Changes

- [#3891](https://github.com/finos/legend-studio/pull/3891) [`8a89338`](https://github.com/finos/legend-studio/commit/8a89338a6ec252882891247b0d23dc842a1fd01b) ([@gs-gunjan](https://github.com/gs-gunjan)) - Fixing Caching for CSV

## 0.2.7

### Patch Changes

- [#3885](https://github.com/finos/legend-studio/pull/3885) [`dd00138`](https://github.com/finos/legend-studio/commit/dd00138cddfeaa034e2528b23a067326cd233b69) ([@gs-gunjan](https://github.com/gs-gunjan)) - Improve performance for caching data

## 0.2.6

## 0.2.5

## 0.2.4

## 0.2.3

## 0.2.2

### Patch Changes

- [#3869](https://github.com/finos/legend-studio/pull/3869) [`ce88ccd`](https://github.com/finos/legend-studio/commit/ce88ccd5d3ed0840427ad2b31afb18604354e554) ([@gs-gunjan](https://github.com/gs-gunjan)) - generating plan with always vX_X_X version

## 0.2.1

## 0.2.0

### Patch Changes

- [#3861](https://github.com/finos/legend-studio/pull/3861) [`25bf6db`](https://github.com/finos/legend-studio/commit/25bf6db44fa42254b78136695c6c6246b8c77c23) ([@kelly-thai](https://github.com/kelly-thai)) - Update default report title to query name

## 0.1.21

### Patch Changes

- [#3856](https://github.com/finos/legend-studio/pull/3856) [`80971ca`](https://github.com/finos/legend-studio/commit/80971cabf2b52b695e5e46b538692883f46d8b6e) ([@kelly-thai](https://github.com/kelly-thai)) - Update error message if Legend DataCube URL could not be generated

## 0.1.20

### Patch Changes

- [#3849](https://github.com/finos/legend-studio/pull/3849) [`3fc168e`](https://github.com/finos/legend-studio/commit/3fc168ebe789d83dc3b7d9fee0c0b618092745dd) ([@kelly-thai](https://github.com/kelly-thai)) - Add integration between Query and DataCube, allow users to now open their saved query results in DataCube via a link provided by Query.

## 0.1.19

## 0.1.18

## 0.1.17

## 0.1.16

## 0.1.15

## 0.1.14

## 0.1.13

## 0.1.12

## 0.1.11

## 0.1.10

## 0.1.9

## 0.1.8

## 0.1.7

## 0.1.6

## 0.1.5

## 0.1.4

## 0.1.3

### Patch Changes

- [#3753](https://github.com/finos/legend-studio/pull/3753) [`72f70b6`](https://github.com/finos/legend-studio/commit/72f70b62a6e15d96e6f1116ee84ed34eaba82022) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Edit existing data cube query

## 0.1.2

## 0.1.1

## 0.1.0
