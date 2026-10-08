---
'@finos/legend-application-marketplace': patch
'@finos/legend-server-marketplace': patch
'@finos/legend-application-query': patch
---

Marketplace: home page and DataSpaces tab search/autosuggest now query DataSpaces only, drop the stale Lakehouse Access "NEW" badge, and refresh both tabs' intro banners to reflect the split. The DataSpaces tab's banner now links directly to the Lakehouse Access tab, its result count reads "DataSpaces", and "Dataspaces" capitalization is unified to "DataSpaces" throughout. The legacy dataspace URL moves from `/dataProduct/legacy` to `/dataspace`, with the old path redirecting so existing links keep working — including Legend Query's "Open Data Space" button, which now points directly at the new `/dataspace` URL.
