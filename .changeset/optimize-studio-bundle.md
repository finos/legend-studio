---
'@finos/legend-dev-utils': patch
'@finos/legend-application-studio-deployment': patch
'@finos/legend-art': patch
'@finos/legend-application-marketplace': patch
'@finos/legend-application-studio': patch
'@finos/legend-extension-dsl-data-product': patch
---

Optimize Studio webapp bundle size and loading performance:

- Add runtime chunk and granular vendor splitting (monaco/aggrid/cytoscape/mathjs) for better caching
- Make Monaco languages/features configurable via environment variables (STUDIO_MONACO_LANGS, STUDIO_MONACO_FEATURES)
- Reduce font payload to latin subset and essential weights only (from 33 to 16 imports)
- Update font-weight CSS from 300 to 400 to match available font weights after optimization
- Emit gzip and brotli pre-compressed assets for faster network delivery

Results: 3.1% uncompressed entrypoint reduction (15.9 MiB → 15.4 MiB), 55% main vendor chunk reduction (10.2 MiB → 4.56 MiB), ~78% estimated transfer size reduction with brotli compression (~3.5 MiB on-wire vs 15.9 MiB baseline)
