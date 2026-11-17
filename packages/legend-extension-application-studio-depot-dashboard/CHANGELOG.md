# @finos/legend-extension-application-studio-depot-dashboard

## 0.1.120

## 0.1.119

### Patch Changes

- [#5886](https://github.com/finos/legend-studio/pull/5886) [`6ea84a0`](https://github.com/finos/legend-studio/commit/6ea84a070de3b3f01c773ba59921cb069005e1be) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Depot dashboard: the grids keep their sort when the flatten modal opens, and sort and filter rows again as they fill in after Refresh; a snapshot opens at the head of its project instead of at a `master-SNAPSHOT` version; once Flatten has opened a review, the row links to it in GitLab and in Studio in place of Flatten, through Refresh. `generateViewEntityRoute` is exported.

- [#5886](https://github.com/finos/legend-studio/pull/5886) [`6ea84a0`](https://github.com/finos/legend-studio/commit/6ea84a070de3b3f01c773ba59921cb069005e1be) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Depot dashboard: a Latest Version column, the project's latest release or "(unreleased)", and a link to the project in GitLab next to its id. `StoreProjectData` now reads the `latestVersion` Depot returns with a project.

## 0.1.118

### Patch Changes

- [#5881](https://github.com/finos/legend-studio/pull/5881) [`1bd5a03`](https://github.com/finos/legend-studio/commit/1bd5a0332e889beed08a4815ec54ae14eab0fe67) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Depot dashboard: show the user's access and actions on each project, link each element name to the element and copy its path, give each element type and scope its own shareable address, count a generation specification's stages and every generation element in a parallel stage, and keep what each element type and scope fetched until Refresh.

- [#5881](https://github.com/finos/legend-studio/pull/5881) [`25d2928`](https://github.com/finos/legend-studio/commit/25d292889eb28b6d7185183f1d34926f321c9cc9) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Depot dashboard: list data spaces, with their execution contexts, executables, template queries, diagrams and elements counted, the user's access to each project, and their title, default execution context, support info and mappings. Fix the GroupId:ArtifactId and two data product column headers' spelling.

- [#5881](https://github.com/finos/legend-studio/pull/5881) [`5136e42`](https://github.com/finos/legend-studio/commit/5136e42eaf94225633401ec61d32d5c0d6dfd93e) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Depot dashboard: a Flatten button on generation specifications with more than one stage, for users who can create workspaces. It flattens the specification on master in a new group workspace, after updating to the latest project structure and removing platform version overrides, and opens a review.

- [#5881](https://github.com/finos/legend-studio/pull/5881) [`ac9b901`](https://github.com/finos/legend-studio/commit/ac9b901443ed9668606a9ab910f727bbc382cbd1) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Depot dashboard: fetch data products and generation specifications at most 8 at a time and look each project up once. Starting every request at once made the browser fail them with `net::ERR_INSUFFICIENT_RESOURCES`.

## 0.1.117

### Patch Changes

- [#5870](https://github.com/finos/legend-studio/pull/5870) [`c4ddb59`](https://github.com/finos/legend-studio/commit/c4ddb5984cc4ec681b9efcc0ae65f9ef91f13a36) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Depot dashboard: list generation specifications from the Element Type picker, with their generation elements and file generations (counts and paths) and a link to each project.

## 0.1.116

## 0.1.115

## 0.1.114

## 0.1.113

## 0.1.112

## 0.1.111

## 0.1.110

## 0.1.109

## 0.1.108

## 0.1.107

## 0.1.106

## 0.1.105

## 0.1.104

## 0.1.103

## 0.1.102

## 0.1.101

## 0.1.100

## 0.1.99

## 0.1.98

## 0.1.97

## 0.1.96

## 0.1.95

## 0.1.94

## 0.1.93

## 0.1.92

## 0.1.91

## 0.1.90

## 0.1.89

## 0.1.88

## 0.1.87

## 0.1.86

## 0.1.85

### Patch Changes

- [#5380](https://github.com/finos/legend-studio/pull/5380) [`b8b986f`](https://github.com/finos/legend-studio/commit/b8b986ffbe787535eddcdac9854a402679f37faa) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add depot dashboard columns for whether a data product has a model access point group, whether any model access point group defines featured elements, and whether the data product has a native access point group.

## 0.1.84

## 0.1.83

## 0.1.82

## 0.1.81

## 0.1.80

## 0.1.79

## 0.1.78

## 0.1.77

## 0.1.76

## 0.1.75

## 0.1.74

## 0.1.73

## 0.1.72

## 0.1.71

## 0.1.70

### Patch Changes

- [#5237](https://github.com/finos/legend-studio/pull/5237) [`b7e3fe9`](https://github.com/finos/legend-studio/commit/b7e3fe97b3e4c1e895302c794145aa1905241206) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Fix the Depot Dashboard AG-Grid and element-type selector being locked to the dark theme. Both now follow the application's active color theme (matching the pattern used by `DatabaseBuilderWizard`, `QueryBuilderTDSGridResult`, etc.).

## 0.1.69

### Patch Changes

- [#5226](https://github.com/finos/legend-studio/pull/5226) [`476f055`](https://github.com/finos/legend-studio/commit/476f055ffe77e6eeb6e350546e060ba98aa48877) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Introduce a scalable, theme-aware styling foundation for Legend Studio. Component styles now consume a two-tier CSS variable system (palette tokens → role-based semantic tokens such as `--color-bg-panel`, `--color-text-primary`, `--color-border-default`) that is remapped per theme via a body class (`theme__default-dark` / `theme__default-light`), rather than hardcoding palette colors directly. This makes the dark theme the stable default while enabling a light theme and additional themes in the future. No public API changes — existing dark-theme appearance is preserved.

## 0.1.68

## 0.1.67

## 0.1.66

## 0.1.65

## 0.1.64

## 0.1.63

## 0.1.62

## 0.1.61

## 0.1.60

## 0.1.59

## 0.1.58

## 0.1.57

## 0.1.56

## 0.1.55

## 0.1.54

## 0.1.53

## 0.1.52

## 0.1.51

## 0.1.50

## 0.1.49

## 0.1.48

## 0.1.47

## 0.1.46

## 0.1.45

## 0.1.44

## 0.1.43

## 0.1.42

## 0.1.41

## 0.1.40

## 0.1.39

## 0.1.38

## 0.1.37

## 0.1.36

## 0.1.35

## 0.1.34

## 0.1.33

## 0.1.32

## 0.1.31

## 0.1.30

## 0.1.29

### Patch Changes

- [#4829](https://github.com/finos/legend-studio/pull/4829) [`12f4f1f`](https://github.com/finos/legend-studio/commit/12f4f1f4b1e133d9e7580ea29411d667c1bfd882) ([@gs-gunjan](https://github.com/gs-gunjan)) - fixing release builds

## 0.1.28

### Patch Changes

- [#4823](https://github.com/finos/legend-studio/pull/4823) [`f8847bc`](https://github.com/finos/legend-studio/commit/f8847bc843d88ed2852f6a9a2967b049498203ab) ([@jackp5150](https://github.com/jackp5150)) - Added rendering and grid value tests to depot dashboard

## 0.1.27

## 0.1.26

### Patch Changes

- [#4810](https://github.com/finos/legend-studio/pull/4810) [`3483b8a`](https://github.com/finos/legend-studio/commit/3483b8af08786fa1712b90affa0e65e17b77b814) ([@TharunRajeev](https://github.com/TharunRajeev)) - Updated ag-grid version to 35.0.0

## 0.1.25

## 0.1.24

## 0.1.23

### Patch Changes

- [#4787](https://github.com/finos/legend-studio/pull/4787) [`cc95a2a`](https://github.com/finos/legend-studio/commit/cc95a2a0aa719889e707c854a6d2a9016a8733e2) ([@jackp5150](https://github.com/jackp5150)) - Added isEnterprise column to depot dashboard

## 0.1.22

## 0.1.21

## 0.1.20

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

### Patch Changes

- [#4679](https://github.com/finos/legend-studio/pull/4679) [`66859fa`](https://github.com/finos/legend-studio/commit/66859fa3ac8cd6378b6cffcb1f82a9452abc454a) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Fix critical security vulnerability in React Server Components (CVE-2025-55182) by upgrading React from 19.0.0 to 19.0.1.

  See: https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components
  CVE: https://www.cve.org/CVERecord?id=CVE-2025-55182

## 0.1.9

## 0.1.8

## 0.1.7

## 0.1.6

## 0.1.5

### Patch Changes

- [#4638](https://github.com/finos/legend-studio/pull/4638) [`80904a4`](https://github.com/finos/legend-studio/commit/80904a41f08ee55bd1ae802797ad12e342865b4b) ([@kelly-thai](https://github.com/kelly-thai)) - Update operational metadata roundtrip in studio

## 0.1.4

### Patch Changes

- [#4624](https://github.com/finos/legend-studio/pull/4624) [`8926940`](https://github.com/finos/legend-studio/commit/8926940ce7f86ec907147c57db54315aef4bb738) ([@kelly-thai](https://github.com/kelly-thai)) - Add expertise, coverage regions, update frequency refactor to studio metamodel

## 0.1.3

## 0.1.2

## 0.1.1

## 0.1.0

### Minor Changes

- [#4611](https://github.com/finos/legend-studio/pull/4611) [`5dabccf`](https://github.com/finos/legend-studio/commit/5dabccf9ddbdb87a58d339a07ce3f1764df8ef6b) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Dashboard to show Data Product from depot server
