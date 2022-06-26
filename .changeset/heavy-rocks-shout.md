---
'@finos/legend-graph': major
---

**BREAKING CHANGE:** Removed `V1_getExtraSourceInformationKeys` and `AbstractPureGraphManager.pruneSourceInformation` as we have refactored to do this more systematically. If you need to prune source information, you can still use `MetaModalUtils.pruneSourceInformation`, which is now configured to remove all fields with the suffix `sourceInformation`.

**BREAKING CHANGE:** `AbstractPureGraphManager.elementToEntity` now takes an `option: { pruneSourceInformation?: boolean }` instead of a boolean flag to determine if it should prune the source information.
