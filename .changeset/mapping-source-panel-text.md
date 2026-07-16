---
'@finos/legend-application-studio': patch
---

Fix unreadable (black-on-black) text in the mapping editor source panel in dark
theme: source tree node labels (class properties, relational columns, flat-data
fields) inherited the browser-default black once the panel background was
tokenized to follow the theme; the panel content now sets a themed text color.
Also fix the property multiplicity badge, which paired `--color-text-inverted`
with `--color-bg-tag` (dark-on-dark in dark theme).
