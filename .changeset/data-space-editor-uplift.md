---
'@finos/legend-extension-dsl-data-space-studio': patch
'@finos/legend-application-studio': patch
---

Data space editor: a header with the data space's title, path and status (verified, in development, external, deprecated), and execution context and executable counts in the sidebar. Home is in sections, with diagrams and elements as tables (elements show their type and an Included/Excluded switch) and support info as contacts and links, now including the support URL and a way to clear it. Execution contexts and executables use cards, the default context is a toggle, and executable tabs say whether each is a service, a function or a query. The Info tab shows statuses, the deprecation notice with a preview, and related data spaces. Studio exports `EditorForm` and `EditorFormSection`, whose sections take header actions.
