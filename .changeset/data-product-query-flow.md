---
'@finos/legend-application-query': minor
'@finos/legend-graph': minor
'@finos/legend-query-builder': patch
'@finos/legend-extension-dsl-data-product': patch
'@finos/legend-application-marketplace': patch
---

Add data product query flow support

- Add `DataProductAnalysis` and `DataProductAnalysisQueryResult` to `legend-graph` for analysing data product model access points
- Add `DataProductQueryCreator` component and `DataProductQueryCreatorStore` / `DataProductSelectorState` to `legend-application-query` to allow users to create queries directly from a data product's model access points
- Add `DataProductInfo` panel and `LegendQueryDataProductQueryBuilder` component to `legend-application-query`
- Update `QueryEditorStore` to support launching the query editor from a data product context
- Update `DataProductQueryBuilder` and `QueryBuilderResultState` in `legend-query-builder` for data product execution context handling
- Update `DataProductViewerState` in `legend-extension-dsl-data-product` and `ModelDocumentationViewer` in `legend-lego` with related fixes
- Update marketplace navigation and product viewer store in `legend-application-marketplace`
