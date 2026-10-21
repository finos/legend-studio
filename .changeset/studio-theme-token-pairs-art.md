---
'@finos/legend-art': patch
---

Pair text and background color tokens correctly in the light and dark themes: a default `btn__dropdown-combo` (on `--color-bg-tag`) now uses `--color-text-primary` and only the `--primary` variant uses `--color-text-on-accent`, including its dropdown caret; and the `panel__header__title__label--light` modifier no longer hardcodes grey text on a light background, so panel header chips follow the theme even when an editor restyles their background.
