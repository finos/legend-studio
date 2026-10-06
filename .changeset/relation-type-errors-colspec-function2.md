---
'@finos/legend-graph': patch
---

Report an engine compilation failure from `getLambdaRelationType` and `getBatchLambdasRelationType` as a `CompilationError` (with source information), like `getLambdaReturnType`. Fix the single `ColSpec` transformer, which wrote `function1` into `function2`.
