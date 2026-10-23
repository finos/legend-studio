---
'@finos/legend-application-studio': patch
---

Fix low-contrast controls in the light and dark themes. The query builder dialog's Save Query button and header icons use dark ink on the yellow header (were 2.2–2.5:1). The mapping test explorer's total, passed and failed counts pick their text color per fill (were 2.6–2.9:1). Data product warnings use the theme's error color (were 2.6:1 in dark), and the description hint uses muted text. Splitter lines use border tokens instead of fixed greys, so they no longer draw dark lines in light or light lines in dark.
