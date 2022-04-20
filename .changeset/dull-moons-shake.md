---
'@finos/legend-graph': major
---

**BREAKING CHANGE:** `BasicModel.addOwnElemnet()` and `PureModel.addElement()` will now take the package path for the new element, the creation of the element package chain and setting the element package will be handled here as well, consumer of the function `PureModel.addElement()` will no longer need to manually create the package.
