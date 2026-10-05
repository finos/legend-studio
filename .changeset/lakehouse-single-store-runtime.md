---
'@finos/legend-application-query': patch
'@finos/legend-application-studio': patch
'@finos/legend-extension-dsl-data-space-studio': patch
'@finos/legend-extension-dsl-data-space': patch
'@finos/legend-graph': patch
'@finos/legend-query-builder': patch
---

Add support for `LakehouseSingleStoreRuntime` and recognize it as a lakehouse runtime everywhere it matters:

- Introduce `LakehouseSingleStoreRuntime` (SingleStore, `environment` only) alongside the existing `LakehouseRuntime` (Snowflake, `environment` + `warehouse`, or a `connection`), sharing a new `LakehouseBaseRuntime`/`V1_LakehouseBaseRuntime` base that carries only `environment` -- matching the backend engine's own `LakehouseBaseRuntime` class hierarchy. `warehouse` and `connectionPointer` remain exclusive to `LakehouseRuntime`.
- Add V1 transformation, builder and serialization support for the new type in `legend-graph`, including a fix to `V1_serializeRuntime`/`V1_deserializeRuntime`'s dispatch order (Lakehouse subtypes must be checked before the generic `V1_EngineRuntime` check, since `V1_LakehouseRuntime` extends it and would otherwise be misclassified).
- Broaden lakehouse-runtime recognition that's generic to _any_ Lakehouse runtime (mapping-compatibility exemption, change-detection/hashing, compatible-runtime filtering in `legend-query-builder`/`legend-extension-dsl-data-space`, info-modal guards) to `instanceof LakehouseBaseRuntime`, while keeping narrow `instanceof LakehouseRuntime` checks only where behavior genuinely differs (the warehouse field, the connection picker, the type-selector UI, and runtime labels).
- Split the Studio runtime editor (state + component) into a shared `LakehouseBaseRuntimeEditorState`/`LakehouseBaseRuntimeEditor` plus `LakehouseSingleStoreRuntimeEditorState`/`LakehouseSingleStoreRuntimeEditor` (environment field only) and `LakehouseRuntimeEditorState`/`LakehouseRuntimeEditor` (adds the type toggle, warehouse field and connection picker), and extend new-element creation, `FunctionTestableState` and change-detection to recognize the new type.
- Extend `LakehouseRuntimeConfigModal` to support editing a `LakehouseSingleStoreRuntime` (environment only, no warehouse field), while preserving the user's previously-persisted Snowflake warehouse preference when applying an env-only change on a single-store runtime, since the persisted user-data blob is fully overwritten rather than merged.
- Guard against `useAuth()` returning `undefined` (e.g. when rendered outside an `AuthProvider`) before accessing `auth.user?.access_token` in the lakehouse runtime editor, to avoid a runtime crash.
- Add import-resolution roundtrip tests for `LakehouseRuntime` and `LakehouseSingleStoreRuntime`, and fix the `createModelSchema` field order for both (`environment`/`warehouse` were declared after `mappings`), which violated the ASCII-alphabetical field-ordering convention expected for backend Jackson/GSON compatibility.
