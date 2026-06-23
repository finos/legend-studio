---
'@finos/legend-application-studio': patch
---

Fix dark-theme rendering in the Class Editor: pass `darkMode` to the supertype, profile, tagged-value, stereotype, and property-detail-panel (property aggregation / tagged values / stereotype) `CustomSelectorInput`s so they no longer render as white dropdowns; and restyle `&__multiplicity-bound` (enabled, `[disabled]`, and `*` upper-bound) to use semantic input/panel/text tokens so the lower/upper bound digits stay readable.
