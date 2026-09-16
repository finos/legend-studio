---
'@finos/legend-application-data-cube': patch
'@finos/legend-application-query': patch
'@finos/legend-query-builder': patch
'@finos/legend-graph': patch
---

Show a dedicated access view when a query against a data product fails with an entitlement error, naming the data product and access point group and linking out to Marketplace to request access, instead of the generic "Check Entitlements" flow which cannot report on data product entitlements. Warehouse errors are classified separately: for data products they show the warehouse the query ran against and link to the `snowflake.active-warehouse-issue.faq` documentation entry when one is registered, otherwise the default error view is used.
