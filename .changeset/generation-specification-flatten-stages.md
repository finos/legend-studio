---
'@finos/legend-application-studio': patch
---

Flatten a `GenerationSpecification` into one stage from its editor, so every generation runs together against one compiled model - one recompile instead of one per stage. It is an action the author takes, never a suggestion: a generation that needs another one's output then fails on its card, which offers to move it back into a stage of its own. Stages that share an element cannot be flattened, since one stage cannot run the same element twice, and a read-only specification offers no flatten.
