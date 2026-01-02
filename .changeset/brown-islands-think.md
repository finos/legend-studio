---
'@finos/legend-application-marketplace-deployment': patch
'@finos/legend-application-marketplace': patch
---

Reduce bundle size and improve load time performance through lazy loading and vendor chunk splitting

- Implement lazy loading for page components using React.lazy() with dynamic imports
- Split vendor bundle into separate chunks (monaco, mui, react, mobx) for better caching
- Reduce initial entrypoint size from 11.4 MiB to 7.28 MiB (36% reduction)
