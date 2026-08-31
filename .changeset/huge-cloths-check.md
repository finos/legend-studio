---
'@finos/legend-extension-dsl-data-space-studio': patch
---

Rename user-facing "Data Product" strings to "Data Space" throughout the Studio Data Space editor so the label matches the concept and no longer collides with the Lakehouse Data Product concept:

- Data Space element type badge in the Studio Explorer and the "New Element" wizard: `DATA_SPACE_ELEMENT_TYPE` changed from `'DATA PRODUCT'` to `'DATA SPACE'`.
- Data Space editor: panel header title ("Data Space") and "Preview Data Space" toolbar button tooltip.
- Data Space general editor tabs: Home tab title/description prompts ("Provide a title for this Data Space.", "Provide a description for this Data Space.", "Use AI to suggest a description for this data space"), Diagrams section prompt, Elements section prompt, and Support Info section prompt.
- Data Space preview dialog: modal title ("Preview Data Space") and load-failure message.
- "New Data Space" driver: title/description input placeholders in the create-element wizard.
- Data Space query action and template query promotion review flow error/alert messages, commit message (`promote-as-template-query: promote query as a template query to data space`), review title, and success/failure alerts now consistently say "data space".
- Data Space preview state error message.
- Data Space Pure grammar code snippet: fixed the inserted snippet from `Data Product ${1:model::NewDataSpace}` to `DataSpace ${1:model::NewDataSpace}` so it matches the `DataSpace` parser keyword (`PURE_GRAMMAR_DATA_SPACE_ELEMENT_TYPE_LABEL`). The previous snippet would have produced invalid Pure grammar.

Strings that genuinely refer to the Lakehouse `DataProduct` element used as a mapping provider inside a Data Space execution context (e.g. "See data product" navigation in `DataSpaceExecutionContextEditor`) are intentionally unchanged.
