---
'@finos/legend-application': major
---

**BREAKING CHANGE:** Create a new abstract class `LegendApplicationPluginManager` that contains plugins that is relevant at application level, such as `telemetry`, `tracer`, `logger`, etc. Now all specific Legend applications plugin manager must extend this class, e.g. `LegendStudioPluginManager extends LegendApplicationPluginManager`.
