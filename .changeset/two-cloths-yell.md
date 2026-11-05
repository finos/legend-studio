---
'@finos/legend-query-builder': patch
---
Allow optional Date parameters (multiplicity [0..1]) to default to "No Value" instead of forcing a date, and omit them from execution payload when unset.
