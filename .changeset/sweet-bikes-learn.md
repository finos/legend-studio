---
'@finos/eslint-plugin-legend-studio': patch
---

Update custom rules to also include `exports` and add rule to prevent importing from the same workspace using absolute imports, e.g. a file in `legend-shared` with an import from `@finos/legend-shared` is a violation.
