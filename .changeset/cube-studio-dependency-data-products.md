---
'@finos/legend-application-studio': patch
---

Legend Cube in Studio reads the data products of the project's dependencies as well as its own. Create MatView lists them, and Edit MatView reopens a view that reads one, e.g. joined with the project's ingest data set. Before, it said "Cube finds no data product …". The workspace with its dependencies counts as one project, so a dependency's data product joins the project's ingest data sets as the project's own does.
