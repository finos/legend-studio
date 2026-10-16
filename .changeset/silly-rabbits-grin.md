---
'@finos/legend-extension-dsl-data-product': patch
---

1. **Cross-APG status leak** (`DataProductAPGState.ts`,
   `fetchDataRequestAccessFallback`): this fallback fetches every data
   request for the whole data product, but never filtered the list down to
   the current APG before matching on org membership. The first request
   where the user's org happened to match was blindly attributed to
   whichever APG ran the fallback, regardless of which APG the request was
   actually for.

2. **Duplicate requests not ranked** (same method): once filtered to the
   correct APG, the fallback also stopped at the _first_ org-matched request
   instead of picking the most advanced one among duplicates (e.g. an
   earlier denied request vs. a newer pending one) — unlike the existing,
   correct handling for duplicate _contracts_ elsewhere in the same file.

3. **Wrong popup on click** (`DataProductAPGState.ts`,
   `handleContractClick`): the click handler opened the contract viewer
   whenever _any_ contract existed for the APG, regardless of whether it was
   stale/denied, instead of checking which source (contract vs.
   request) actually produced the currently-displayed access status.

4. **Missing per-APG guard on the request dialog**
   (`DataProductAPGAccessRequestControl.tsx`): the request viewer dialog
   read off state shared across all APGs in the list, without the same
   per-APG ownership check the contract viewer already had.

5. **Backdrop blackout** (`DataAccessRequestViewer.tsx`): the dialog used
   MUI's default opaque backdrop for the pending/in-progress data access
   request popup.

   Fix APG-specific access status resolution, request dialog ownership/routing, and pending request viewer backdrop behavior for data products.
