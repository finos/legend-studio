---
'@finos/legend-studio': patch
---

**BREAKING CHANGE:** Simplify element hash computation: now, the the computation should be placed in `_elementHashCode`, `hashCode` is specified at `PackageableElement` level that does some logical check for disposed and frozen objects before returning `_elementHashCode`. This way, we don't need to repeat as much code when introducing newer types of `PackageableElement` and we would output error when frozen elements are modified somehow.
