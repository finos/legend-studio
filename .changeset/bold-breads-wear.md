---
'@finos/legend-application-studio': patch
---

Add Compute graph-modifier setters: `appDirComputeOwner_*` for the owner, and one per modelled Snowflake specification property. Each accepts `undefined` so a property can be cleared through the same action that writes it. These land ahead of the form-mode editor that calls them.
