---
'@finos/legend-dev-utils': patch
---

The jsdom test setup (`setupDOMPolyfills`) now installs a no-op `ResizeObserver` instead of the `@juggle/resize-observer` polyfill. In jsdom every element measures 0x0 and has no client rects, so the polyfill never called back anyway, but it ran `getComputedStyle()` on every observed element after every DOM mutation, which made large component tests (e.g. `DataProductViewer.test.tsx`) about twice as slow. A test that mocks element sizes and needs resize callbacks can opt in to the polyfill with `@finos/legend-dev-utils/jest/setupResizeObserverPolyfill`.
