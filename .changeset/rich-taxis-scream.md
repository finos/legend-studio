---
'@finos/legend-application': major
---

**BREAKING CHANGE:** Make `LegendApplicationPluginManager` generic to the application plugin, e.g. `LegendApplicationPluginManager<LegendStudioApplicationPlugin>`, due to this, `ApplicationStore` is now also generic to the application plugin. We also removed `LegendApplication` prefix from certain classes and types to cleanup the codebase and make the code less clunky. In particular, the major renamed items are: `LegendApplicationAssistantService` -> `AssistantService`, `LegendApplicationDocumentationService` -> `DocumentationService`, `LegendApplicationNavigationContextService` -> `ApplicationNavigationContextService`, `LegendApplicationEventService` -> `EventService`, etc.
