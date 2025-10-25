---
'@finos/legend-application-marketplace': patch
'@finos/legend-application-pure-ide': patch
'@finos/legend-application-query': patch
'@finos/legend-application-studio': patch
'@finos/legend-application': patch
'@finos/legend-art': patch
'@finos/legend-extension-dsl-data-product': patch
'@finos/legend-extension-dsl-data-space-studio': patch
'@finos/legend-extension-dsl-data-space': patch
'@finos/legend-extension-dsl-service': patch
'@finos/legend-query-builder': patch
---

Update Material UI dependencies to latest versions (@mui/material 7.3.4, @mui/system 7.3.3, @mui/lab 7.0.1-beta.18, @mui/x-date-pickers 8.14.1) and complete migration from deprecated TransitionProps/PaperProps to the new slotProps API across all Material UI Dialog, Modal, Popover, and Tooltip components. Also resolve MUI v8 date picker compatibility issues.

Reduce Jest worker count from 100% to 2 in test:ci script to address CI memory exhaustion caused by MUI v7's increased memory footprint (documented in mui/material-ui#46908 and #45804, showing 2-5x memory increase during builds/tests).
