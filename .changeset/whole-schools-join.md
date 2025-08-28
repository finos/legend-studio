---
'@finos/legend-application-studio': patch
---

fix(EqualToAssertFailViewer): Preserve native types for accepted values

Previously, accepting actual values for primitive types like integers and floats incorrectly stored them as strings. This commit ensures `EqualToAssertFailViewer` parses and sets these values to their correct native types (number or boolean) based on the expected
