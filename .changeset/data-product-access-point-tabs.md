---
'@finos/legend-extension-dsl-data-product': patch
'@finos/legend-application-marketplace': patch
---

The data product viewer's access point tabs: **Grammar** becomes **Pure Query**, which shows the `#P{<data product>.<access point>}#` accessor that queries the access point (a parameterized access point names its parameters in parentheses, with their types in a caption) and an example, for every compute target; **Query** becomes **Legend Query**. The access point's definition moves into **Column Specifications**, behind a quiet "View definition", and is fetched when first opened. Each code block copies with one click, with the outcome in its tooltip, and follows the app's light or dark theme.

In **Column Specifications**, a column without a description or sample values shows a quiet "—". The data product's owners, and the producer in Studio's preview, read when no column has a description, or there are no sample values, with links to how to add them: the documentation entries `dsl-dataproduct.column-descriptions` and `dsl-dataproduct.sample-values`, when configured. Anyone else without access reads that sample values show once they have it.
