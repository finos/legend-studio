---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
---

More functions in Legend Cube's Group by Column (PLAN §11.27): Median, Percentile, Std Dev and Variance on numbers, and Join Text on texts. Percentile takes a percent from 0 to 100, 90 by default, saved and written as the engine's fraction (`percentile(0.9)`), and its auto-name carries it (`FREIGHT P90`); Std Dev and Variance are the sample ones (`stdDevSample`, `varianceSample`); Join Text joins a group's texts with a separator, `, ` by default, which can't hold a backslash. Apply Window Functions offers Std Dev and Variance too: Snowflake refuses a sorted window of Median, Percentile and Join Text. A Pivot takes none of them, as Snowflake's pivot takes only Count, Sum, Average, Min and Max, and the grid's group rows don't offer them yet. Import Pure reads them back.
