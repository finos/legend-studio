---
'@finos/eslint-plugin-legend-studio': patch
---

Prefer usage of inline type import `import { type ... }` over `import type`; as a result, we have enabled `no-duplicate-imports` rule. Also, we created rule `no-duplicate-exports` to enforce the usage on export side.
