---
'@finos/legend-application-query': patch
---

Rename user-facing "Data Product" strings to "Data Space" in the Data Space flows of Legend Query so the label matches the concept and no longer collides with the Lakehouse Data Product concept:

- Landing page action card label ("Create query from data space").
- Data Space query setup panel and the legacy Data Space query builder: header label, `title`/`placeholder` on the selector and copy-link button, "Open advanced search for data space..." tooltip, and the "does not have any execution contexts" error message.
- "About Data Space" info modal: title ("About Data Space"), "Open Data Space" button, and "Show Data Space Configuration" link.
- Query builder toolbar: the shared `about-dataspace` menu entry (whose label was ambiguous because it was enabled for both Data Space and Lakehouse Data Product query states) is split into two entries — `about-dataspace` labelled **"About Data Space"** (enabled for Data Space query states) and `about-dataproduct` labelled **"About Data Product"** (enabled for Lakehouse Data Product query states) — so the label always matches the current query context.

Tests updated to match the new labels.

The "Data Product" label on the mapping-provider row inside the info modal is intentionally unchanged — it genuinely refers to a Lakehouse Data Product element.
