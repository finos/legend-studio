---
'@finos/legend-shared': major
'@finos/legend-dev-utils': major
---

**BREAKING CHANGE:** Use `@jest/globals` to import `jest` constructs, such as, `expect`, `test`, etc. We bumped into some problem when trying to disable `injectGlobals` in `Jest` config, so that would be left on as default for now, but at least with this change, we restrict usage of `jest` globals in the codebase.
