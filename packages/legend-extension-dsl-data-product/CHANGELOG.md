# @finos/legend-extension-dsl-data-product

## 0.0.50

### Patch Changes

- [#4856](https://github.com/finos/legend-studio/pull/4856) [`1f9a666`](https://github.com/finos/legend-studio/commit/1f9a666208a439073a9201fc220f633efd804d87) ([@travisstebbins](https://github.com/travisstebbins)) - Show Lakehouse env and owners on DataProduct search result cards and DataProduct viewer

## 0.0.49

### Patch Changes

- [#4844](https://github.com/finos/legend-studio/pull/4844) [`f2dddfe`](https://github.com/finos/legend-studio/commit/f2dddfeaab5552378900a5231726fa84e5cb9fd7) ([@kelly-thai](https://github.com/kelly-thai)) - Use RegistryServerClient to add ADS/PDE tags to Access Points

## 0.0.48

## 0.0.47

### Patch Changes

- [#4818](https://github.com/finos/legend-studio/pull/4818) [`d8706e0`](https://github.com/finos/legend-studio/commit/d8706e0c3cbf9c4e95da2b0c22a3c4482c184405) ([@kelly-thai](https://github.com/kelly-thai)) - Update Access Point viewer with Lineage tab

## 0.0.46

## 0.0.45

## 0.0.44

## 0.0.43

### Patch Changes

- [#4784](https://github.com/finos/legend-studio/pull/4784) [`11521ea`](https://github.com/finos/legend-studio/commit/11521eae2d4eb60634dca69f9d039c8690e2a88d) ([@jackp5150](https://github.com/jackp5150)) - Refactor existing functions to use V1_LiteDataContract instead of V1_DataContract

## 0.0.42

### Patch Changes

- [#4773](https://github.com/finos/legend-studio/pull/4773) [`2addf62`](https://github.com/finos/legend-studio/commit/2addf625f4aadafb5ab93b1351fc25c069e4b116) ([@TharunRajeev](https://github.com/TharunRajeev)) - Added button to copy connection string.

- [#4769](https://github.com/finos/legend-studio/pull/4769) [`7775eb5`](https://github.com/finos/legend-studio/commit/7775eb5d1687d5f1ba0b078adc0b03d808c7f11c) ([@jackp5150](https://github.com/jackp5150)) - Collapse all or individual apgs in marketplace

- [#4778](https://github.com/finos/legend-studio/pull/4778) [`8cb8c1c`](https://github.com/finos/legend-studio/commit/8cb8c1c28369163c7fb6b1febbb6856ce98a7fa9) ([@jackp5150](https://github.com/jackp5150)) - Added date created to contract viewer and entitlements page

- [#4781](https://github.com/finos/legend-studio/pull/4781) [`60406ba`](https://github.com/finos/legend-studio/commit/60406ba88e4328422c0d28e7ec15b67ef0158630) ([@travisstebbins](https://github.com/travisstebbins)) - Fix UserRenderer bugs and update isApprovalStatusTerminal to support V1_EnrichedUserApprovalStatus

## 0.0.41

### Patch Changes

- [#4762](https://github.com/finos/legend-studio/pull/4762) [`3e260c2`](https://github.com/finos/legend-studio/commit/3e260c224fd5ef024c01161d7ecd1de6e254345d) ([@jackp5150](https://github.com/jackp5150)) - Fixed link copying, direction on loading, and added APG anchors

- [#4760](https://github.com/finos/legend-studio/pull/4760) [`6e9b475`](https://github.com/finos/legend-studio/commit/6e9b4757832511890705b3885ae37f951ac69cf9) ([@jackp5150](https://github.com/jackp5150)) - Refactored Entitlements contract viewer to separate modal content from page for individual contract rendering

- [#4764](https://github.com/finos/legend-studio/pull/4764) [`f4c4141`](https://github.com/finos/legend-studio/commit/f4c41417235ca750373379ad9dda3d0277737168) ([@jackp5150](https://github.com/jackp5150)) - Determines the furthest contract to show in marketplace

- [#4755](https://github.com/finos/legend-studio/pull/4755) [`8336e04`](https://github.com/finos/legend-studio/commit/8336e0483fc0fb8e67e34aae06757f7b3840c31c) ([@yash0024](https://github.com/yash0024)) - DataProduct viewer - sampleQueries and model documentation

## 0.0.40

### Patch Changes

- [#4741](https://github.com/finos/legend-studio/pull/4741) [`caf4bc6`](https://github.com/finos/legend-studio/commit/caf4bc65a86f9b98cfdadd6973a83124375e0753) ([@travisstebbins](https://github.com/travisstebbins)) - Add ability to invalidate Marketplace lakehouse contract

- [#4751](https://github.com/finos/legend-studio/pull/4751) [`e36cc27`](https://github.com/finos/legend-studio/commit/e36cc279eea927f0891475eb892f250f1d4a6845) ([@TharunRajeev](https://github.com/TharunRajeev)) - Added test for Sql playground Tab.

- [#4758](https://github.com/finos/legend-studio/pull/4758) [`28b6fdb`](https://github.com/finos/legend-studio/commit/28b6fdbf5e708d41e43a3b22187ebf128be0275c) ([@TharunRajeev](https://github.com/TharunRajeev)) - Added sql playground on a full screen overlay.

## 0.0.39

### Patch Changes

- [#4738](https://github.com/finos/legend-studio/pull/4738) [`bce6f96`](https://github.com/finos/legend-studio/commit/bce6f963cc57633ada56bb03a07e94fc38b6469d) ([@TharunRajeev](https://github.com/TharunRajeev)) - Adding Sql playground to marketplace and creating a util file for executing sql query, fetching sample values.

- [#4734](https://github.com/finos/legend-studio/pull/4734) [`5838cda`](https://github.com/finos/legend-studio/commit/5838cda2521247fd56a6cb1a0433c4ec0206d943) ([@gs-gunjan](https://github.com/gs-gunjan)) - marketplace: limiting result to 200

- [#4733](https://github.com/finos/legend-studio/pull/4733) [`9582fd7`](https://github.com/finos/legend-studio/commit/9582fd783542095facd1a5eed26b73e6a301120e) ([@gs-gunjan](https://github.com/gs-gunjan)) - marketplace: make sure unique sample values are shown in marketplace

## 0.0.38

## 0.0.37

## 0.0.36

### Patch Changes

- [#4711](https://github.com/finos/legend-studio/pull/4711) [`69b20fe`](https://github.com/finos/legend-studio/commit/69b20feebb4a2a32f85423fe31aa4b32f14f0b5b) ([@jackp5150](https://github.com/jackp5150)) - Show contract id in subscription viewer

## 0.0.35

### Patch Changes

- [#4712](https://github.com/finos/legend-studio/pull/4712) [`8d905ce`](https://github.com/finos/legend-studio/commit/8d905ce72a29c190cb495425957d7c4b40eaa067) ([@bojja-gs](https://github.com/bojja-gs)) - Implemented dark theme and light theme with toggle throughout marketplace app

- [#4713](https://github.com/finos/legend-studio/pull/4713) [`20c88d0`](https://github.com/finos/legend-studio/commit/20c88d010d4192af3ce9234b7b10e496490555d7) ([@kelly-thai](https://github.com/kelly-thai)) - Add labels for 'Copy' and 'Escalate' icons

## 0.0.34

### Patch Changes

- [#4707](https://github.com/finos/legend-studio/pull/4707) [`84e50cb`](https://github.com/finos/legend-studio/commit/84e50cb42fcd513f915ea774de317c1a26e2c362) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Clean up data product access point tabs + add extension mechanism.

## 0.0.33

### Patch Changes

- [#4691](https://github.com/finos/legend-studio/pull/4691) [`590c24d`](https://github.com/finos/legend-studio/commit/590c24d92886138a1a90b144b51d6f09f729e8e1) ([@gs-gunjan](https://github.com/gs-gunjan)) - marketplace: adding support for querying sample data

## 0.0.32

### Patch Changes

- [#4695](https://github.com/finos/legend-studio/pull/4695) [`ec8e75e`](https://github.com/finos/legend-studio/commit/ec8e75ed8d2d23d2412bf25635b57f04a8df82b1) ([@travisstebbins](https://github.com/travisstebbins)) - Fix bug with handleIsValidChange for producer contracts

## 0.0.31

### Patch Changes

- [#4684](https://github.com/finos/legend-studio/pull/4684) [`8dc3a37`](https://github.com/finos/legend-studio/commit/8dc3a37fb653af43adc425d306f9863f9b50d363) ([@travisstebbins](https://github.com/travisstebbins)) - Fix model documentation state creation

## 0.0.30

### Patch Changes

- [#4679](https://github.com/finos/legend-studio/pull/4679) [`66859fa`](https://github.com/finos/legend-studio/commit/66859fa3ac8cd6378b6cffcb1f82a9452abc454a) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Fix critical security vulnerability in React Server Components (CVE-2025-55182) by upgrading React from 19.0.0 to 19.0.1.

  See: https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components
  CVE: https://www.cve.org/CVERecord?id=CVE-2025-55182

## 0.0.29

### Patch Changes

- [#4671](https://github.com/finos/legend-studio/pull/4671) [`0acfaac`](https://github.com/finos/legend-studio/commit/0acfaac4961a2f779ba92002fe9c102e99cbf259) ([@travisstebbins](https://github.com/travisstebbins)) - Fix create producer contract input being prefilled with user ID

- [#4666](https://github.com/finos/legend-studio/pull/4666) [`0bdc8b8`](https://github.com/finos/legend-studio/commit/0bdc8b828069759124dbb3a5ec2db0206f9a7d28) ([@travisstebbins](https://github.com/travisstebbins)) - Improve handling of errors when fetching access point relation type

- [#4675](https://github.com/finos/legend-studio/pull/4675) [`f60b1ae`](https://github.com/finos/legend-studio/commit/f60b1aee9f775bf03a33a44a4c6b6ceb8ec58638) ([@kelly-thai](https://github.com/kelly-thai)) - Update tags CSS

- [#4669](https://github.com/finos/legend-studio/pull/4669) [`08f0211`](https://github.com/finos/legend-studio/commit/08f0211ea0d3f96a5ae5308016cbc62b56b1967f) ([@jackp5150](https://github.com/jackp5150)) - Added diagram viewer/state logic

- [#4670](https://github.com/finos/legend-studio/pull/4670) [`5681691`](https://github.com/finos/legend-studio/commit/5681691e4eb4457f0c2f577083d833c96ea4dda6) ([@travisstebbins](https://github.com/travisstebbins)) - Improve producer contract rendering

## 0.0.28

### Patch Changes

- [#4654](https://github.com/finos/legend-studio/pull/4654) [`4d4bd54`](https://github.com/finos/legend-studio/commit/4d4bd54333c2d05e5e9e20627083d03e7021fa8c) ([@TharunRajeev](https://github.com/TharunRajeev)) - Removed Python tab

- [#4663](https://github.com/finos/legend-studio/pull/4663) [`41f3d67`](https://github.com/finos/legend-studio/commit/41f3d676e5ae1a0db29c597a0fac041ba79138b2) ([@travisstebbins](https://github.com/travisstebbins)) - Fix handling data access documentation

## 0.0.27

### Patch Changes

- [#4653](https://github.com/finos/legend-studio/pull/4653) [`185e6cb`](https://github.com/finos/legend-studio/commit/185e6cb2e2a4fd111e3b3bbd1c7905e7daf2045f) ([@travisstebbins](https://github.com/travisstebbins)) - Enable producer contract request for enterprise APGs

- [#4646](https://github.com/finos/legend-studio/pull/4646) [`9f77df4`](https://github.com/finos/legend-studio/commit/9f77df4a7e1ddff7446197981dbe3248d3986b70) ([@jackp5150](https://github.com/jackp5150)) - Added ModelDocumentation viewing to ProductWiki

## 0.0.26

### Patch Changes

- [#4638](https://github.com/finos/legend-studio/pull/4638) [`80904a4`](https://github.com/finos/legend-studio/commit/80904a41f08ee55bd1ae802797ad12e342865b4b) ([@kelly-thai](https://github.com/kelly-thai)) - Update operational metadata roundtrip in studio

- [#4637](https://github.com/finos/legend-studio/pull/4637) [`2f99ad0`](https://github.com/finos/legend-studio/commit/2f99ad0660f45e4467f73b899731d0e4f66ee1e7) ([@travisstebbins](https://github.com/travisstebbins)) - Show message when Marketplace subscription is auto-created

## 0.0.25

### Patch Changes

- [#4624](https://github.com/finos/legend-studio/pull/4624) [`8926940`](https://github.com/finos/legend-studio/commit/8926940ce7f86ec907147c57db54315aef4bb738) ([@kelly-thai](https://github.com/kelly-thai)) - Add tags and expertise to data product viewer

## 0.0.24

## 0.0.23

## 0.0.22

### Patch Changes

- [#4608](https://github.com/finos/legend-studio/pull/4608) [`7fda83e`](https://github.com/finos/legend-studio/commit/7fda83e746d4b76681ee40fee4afec94b82f3425) ([@travisstebbins](https://github.com/travisstebbins)) - Fix Marketplace "My Closed Requests" view

## 0.0.21

### Patch Changes

- [#4602](https://github.com/finos/legend-studio/pull/4602) [`8c9e370`](https://github.com/finos/legend-studio/commit/8c9e3702d76fe82a0089b00a81ecac5a78c62c94) ([@travisstebbins](https://github.com/travisstebbins)) - Add contract escalation feature for Marketplace Lakehouse entitlements requests

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
