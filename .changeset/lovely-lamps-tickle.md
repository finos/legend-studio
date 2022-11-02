---
'@finos/legend-graph': major
---

**BREAKING CHANGE:** Removed `TYPICAL_MULTIPLICITY_TYPE` and the method `PureModel.getTypicalMultiplicity()` as typical multiplicities like `[1]`, `[0..*]`, `[1..*]`, etc. are now exposed as static singletons, e.g. `Multiplicity.ONE`, `Multiplicity.ZERO_MANY`, etc.
