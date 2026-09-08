---
'@finos/legend-server-sdlc': patch
'@finos/legend-server-depot': patch
'@finos/legend-server-lakehouse': patch
'@finos/legend-server-marketplace': patch
---

Server client configs now extend `ServerClientConfig`, dropping bespoke `getAuthenticationToken`/`baseHeaders` fields that duplicated the base type. `DepotServerClientConfig`, `MarketplaceServerClientConfig`, `RegistryServerClientConfig`, and `PermitWorkflowServerClientConfig` spread `...config` into `super()`; `TerminalAccessServerClient`'s constructor is removed entirely (inherits `AbstractServerClient`'s). `SDLCServerClientConfig` extends `ServerClientConfig` too, but its constructor keeps forwarding fields explicitly (`baseUrl`, `baseHeaders`, `autoReAuthenticate`, `getAuthenticationToken`) rather than spreading, to keep the diff minimal on a client with its own custom 401 re-auth handling. `LakehouseIngestServerClient` and `LakehousePlatformServerClient` similarly drop their now-redundant `getAuthenticationToken` constructor parameter, relying on the shared default provider (see the `@finos/legend-application` changeset). Also fixes several Lakehouse/Permit clients sending a literal `Authorization: Bearer undefined` header.
