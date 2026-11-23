---
'@finos/legend-application-data-cube': patch
---

Search Lakehouse data products with the marketplace's search in the Lakehouse consumer source builder. With `marketplace.serverUrl` configured, the Data Product picker searches the marketplace as one types (debounced, the first 100 matches of the chosen environment, a hint when there are more) instead of loading and filtering the whole list in the browser. The chosen data product stays in the field as text to edit, and emptying the field drops the choice. Without the setting, the list is loaded and filtered as before.
