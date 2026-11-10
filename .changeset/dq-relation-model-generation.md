---
'@finos/legend-extension-dsl-data-quality': patch
---

Data quality relation validations and relation comparisons are model generations, as they are in engine's protocol: they extend `ModelGenerationSpecification`, show up in the generation specification editor and can be dragged into it from the project explorer. A relation validation no longer extends `DataQualityValidationConfiguration`.
