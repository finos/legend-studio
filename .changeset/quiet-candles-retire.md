---
'@finos/legend-application-studio': major
---

**BREAKING CHANGE:** Removed `StudioLambdaEditor` and `StudioTextInputEditor` since there is no longer need to have these components as we have generalized our keyboard handling in the parent components. Migrate to `LambaEditor` and `TextInputEditor` instead.
