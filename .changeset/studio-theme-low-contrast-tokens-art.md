---
'@finos/legend-art': patch
---

Raise `--color-text-disabled` in the default dark and default light themes so placeholders, empty states and secondary labels reach 3:1 on every panel, header and hover surface: `#9a9a9a` in dark (was `#737373`) and `#808080` in light (was `#9a9a9a`). It stays dimmer than `--color-text-muted`. The `:root` fallback is unchanged, because the high-contrast themes inherit it. Adds palette colors `--color-dark-grey-450`, `--color-lime-500`, `--color-lime-600` and `--color-teal-300`.
