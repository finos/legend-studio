/**
 * Copyright (c) 2020-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  action,
  flow,
  observable,
  makeObservable,
  computed,
  flowResult,
} from 'mobx';
import {
  type GeneratorFn,
  LogEvent,
  assertErrorThrown,
  guaranteeNonNullable,
  guaranteeType,
  filterByType,
  ActionState,
  hashArray,
  assertTrue,
  assertNonNullable,
} from '@finos/legend-shared';
import { QueryBuilderFilterState } from './filter/QueryBuilderFilterState.js';
import { QueryBuilderFetchStructureState } from './fetch-structure/QueryBuilderFetchStructureState.js';
import {
  QueryBuilderTextEditorMode,
  QueryBuilderTextEditorState,
} from './QueryBuilderTextEditorState.js';
import { QueryBuilderExplorerState } from './explorer/QueryBuilderExplorerState.js';
import { QueryBuilderResultState } from './QueryBuilderResultState.js';
import {
  processQueryLambdaFunction,
  processParameters,
} from './QueryBuilderStateBuilder.js';
import { QueryBuilderUnsupportedQueryState } from './QueryBuilderUnsupportedQueryState.js';
import {
  type Class,
  type Mapping,
  type Runtime,
  type GraphManagerState,
  type PackageableElement,
  type ValueSpecification,
  type Type,
  type RelationType,
  type QueryGridConfig,
  type QueryExecutionContext,
  type FunctionAnalysisInfo,
  type GraphData,
  Accessor,
  GRAPH_MANAGER_EVENT,
  CompilationError,
  extractSourceInformationCoordinates,
  LambdaFunctionInstanceValue,
  RawLambda,
  VariableExpression,
  observe_ValueSpecification,
  ObserverContext,
  isStubbed_RawLambda,
  buildLambdaVariableExpressions,
  buildRawLambdaFromLambdaFunction,
  PrimitiveType,
  RuntimePointer,
  QueryExplicitExecutionContext,
  attachFromQuery,
  PackageableElementExplicitReference,
  InMemoryGraphData,
  type LambdaFunction,
} from '@finos/legend-graph';
import {
  buildLambdaFunction,
  buildExecutionContextState,
} from './QueryBuilderValueSpecificationBuilder.js';
import {
  type CommandRegistrar,
  type GenericLegendApplicationStore,
  APPLICATION_EVENT,
} from '@finos/legend-application';
import { QueryFunctionsExplorerState } from './explorer/QueryFunctionsExplorerState.js';
import {
  QueryBuilderParametersState,
  type QueryBuilderParameterValue,
} from './QueryBuilderParametersState.js';
import type { QueryBuilderFilterOperator } from './filter/QueryBuilderFilterOperator.js';
import { getQueryBuilderCoreFilterOperators } from './filter/QueryBuilderFilterOperatorLoader.js';
import { QueryBuilderChangeDetectionState } from './QueryBuilderChangeDetectionState.js';
import {
  QueryBuilderMilestoningState,
  type QueryBuilderMilestoningKind,
} from './milestoning/QueryBuilderMilestoningState.js';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from './QueryBuilderStateHashUtils.js';
import { QUERY_BUILDER_COMMAND_KEY } from './QueryBuilderCommand.js';
import { QueryBuilderWatermarkState } from './watermark/QueryBuilderWatermarkState.js';
import { QueryBuilderConstantsState } from './QueryBuilderConstantsState.js';
import { QueryBuilderCheckEntitlementsState } from './entitlements/QueryBuilderCheckEntitlementsState.js';
import { QueryBuilderTDSState } from './fetch-structure/tds/QueryBuilderTDSState.js';
import { QueryBuilderRelationColumnProjectionColumnState } from './fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import {
  QUERY_BUILDER_PURE_PATH,
  QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS,
} from '../graph/QueryBuilderMetaModelConst.js';
import type { QueryBuilderInternalizeState } from './QueryBuilderInternalizeState.js';
import {
  QueryBuilderEmbeddedFromExecutionContextState,
  QueryBuilderExternalExecutionContextState,
  type QueryBuilderExecutionContextState,
} from './QueryBuilderExecutionContextState.js';
import type { QueryBuilderConfig } from '../graph-manager/QueryBuilderConfig.js';
import {
  QUERY_BUILDER_EVENT,
  type QUERY_BUILDER_OPENED_FROM,
} from '../__lib__/QueryBuilderEvent.js';
import { QUERY_BUILDER_SETTING_KEY } from '../__lib__/QueryBuilderSetting.js';
import { QueryBuilderChangeHistoryState } from './QueryBuilderChangeHistoryState.js';
import { type QueryBuilderWorkflowState } from './query-workflow/QueryBuilderWorkFlowState.js';
import { type QueryAgentChatState } from './QueryAgentChatState.js';
import type { QueryBuilder_LegendApplicationPlugin_Extension } from './QueryBuilder_LegendApplicationPlugin_Extension.js';
import { createDataCubeViewerStateFromQueryBuilder } from './data-cube/QueryBuilderDataCubeHelper.js';
import type { QueryBuilderDataCubeViewerState } from './data-cube/QueryBuilderDataCubeViewerState.js';
import { QueryBuilderTelemetryHelper } from '../__lib__/QueryBuilderTelemetryHelper.js';
import type {
  DepotEntityWithOrigin,
  QueryableSourceInfo,
} from '@finos/legend-storage';
import type { FETCH_STRUCTURE_IMPLEMENTATION } from './fetch-structure/QueryBuilderFetchStructureImplementationState.js';

/**
 * The execution context the query builder has resolved to, as reported in
 * telemetry under the `state` key. See
 * {@link QueryBuilderState.getExecutionContextInfo}.
 */
export type QueryBuilderExecutionContextInfo = {
  class?: string | undefined;
  mapping?: string | undefined;
  runtime?: string | undefined;
  /**
   * `true` when the query runs against an inline (engineered) runtime rather
   * than a `RuntimePointer`. Those have no element path to report, so `runtime`
   * is absent — this flag keeps that population visible instead of leaving it
   * indistinguishable from "no runtime selected yet".
   */
  isInlineRuntime?: boolean | undefined;
};

/**
 * The shared envelope carried by every query builder telemetry event.
 *
 * The entry point the builder was opened with (`sourceInfo` — the route) is
 * spread *flat* at the top level, while the execution context it resolved to is
 * nested under `state`. Keeping them separate is what lets a dashboard tell
 * "arrived on mapping X" apart from "currently querying mapping X"; merging the
 * two into one flat object would collapse that distinction.
 */
export type QueryBuilderTelemetryContext = QueryableSourceInfo &
  /**
   * `QueryableSourceInfo` is a marker interface with no declared members — the
   * concrete keys (`sourceType`, `groupId`, `dataSpace`, `dataProduct`, …) vary
   * by entry point and are only known to the application layer. The index
   * signature is what lets those keys sit flat at the top level; it does mean
   * top-level excess-property checking is off. The fields that matter are kept
   * inside the strictly-typed `state` and `change` sub-objects for exactly this
   * reason.
   */
  Record<PropertyKey, unknown> & {
    state?: QueryBuilderExecutionContextInfo | undefined;
  };

/**
 * Summary of the current query builder authoring state, used to enrich
 * telemetry (e.g. query-execution events) with lightweight, non-PII shape
 * information such as which fetch structure is in use and how many columns
 * / filters / parameters have been configured.
 */
export type QueryBuilderQueryInfo = {
  fetchStructureType: FETCH_STRUCTURE_IMPLEMENTATION | string;
  /**
   * `true` when the TDS query is authored against the typed relation function
   * family (`->project`/`->groupBy`/etc. over relation columns). `false` for
   * classic property-driven TDS. `undefined` when the fetch structure is not
   * TDS or when there are no columns to determine yet.
   */
  isTypedFetchStructure?: boolean | undefined;
  parameterCount: number;
  constantCount: number;
  hasFilter: boolean;
  filterNodeCount: number;
  watermarkEnabled: boolean;
  milestoningKind: QueryBuilderMilestoningKind;
  // TDS-specific fields (present when fetchStructureType is TABULAR_DATA_STRUCTURE)
  projectionColumnCount?: number | undefined;
  windowColumnCount?: number | undefined;
  aggregationColumnCount?: number | undefined;
  postFilterNodeCount?: number | undefined;
  hasLimit?: boolean | undefined;
  hasDistinct?: boolean | undefined;
  sortColumnCount?: number | undefined;
  hasSlice?: boolean | undefined;
};

export type QueryBuilderExtraFunctionAnalysisInfo = {
  functionInfoMap: Map<string, FunctionAnalysisInfo>;
  dependencyFunctionInfoMap: Map<string, FunctionAnalysisInfo>;
};

export enum QUERY_BUILDER_LAMBDA_WRITER_MODE {
  STANDARD = 'STANDARD',
  TYPED_FETCH_STRUCTURE = 'TYPED_FETCH_STRUCTURE',
}

export type EntityWithOriginOption = {
  label: string;
  value: DepotEntityWithOrigin;
};

export class ExtraOptionsConfig<T> {
  label: string;
  type: string;
  options:
    | {
        label: string;
        value: T;
      }[]
    | undefined;
  selectedValue: T | undefined;
  onChange: (val: T) => void;
  placeholder?: string | undefined;
  disabled?: boolean | undefined;

  constructor(
    label: string,
    type: string,
    options: { label: string; value: T }[] | undefined,
    selectedValue: T | undefined,
    onChange: (val: T) => void,
    placeholder?: string | undefined,
    disabled?: boolean | undefined,
  ) {
    this.label = label;
    this.type = type;
    this.options = options;
    this.selectedValue = selectedValue;
    this.onChange = onChange;
    this.placeholder = placeholder;
    this.disabled = disabled;

    makeObservable(this, {
      options: observable,
      setOptions: action,
    });
  }

  setOptions(options: { label: string; value: T }[] | undefined): void {
    this.options = options;
  }
}

export abstract class QueryBuilderState implements CommandRegistrar {
  readonly applicationStore: GenericLegendApplicationStore;
  readonly graphManagerState: GraphManagerState;

  readonly changeDetectionState: QueryBuilderChangeDetectionState;
  readonly queryCompileState = ActionState.create();
  readonly observerContext: ObserverContext;
  readonly config: QueryBuilderConfig | undefined;
  readonly workflowState: QueryBuilderWorkflowState;

  explorerState: QueryBuilderExplorerState;
  functionsExplorerState: QueryFunctionsExplorerState;
  parametersState: QueryBuilderParametersState;
  constantState: QueryBuilderConstantsState;
  milestoningState: QueryBuilderMilestoningState;
  fetchStructureState: QueryBuilderFetchStructureState;
  filterState: QueryBuilderFilterState;
  watermarkState: QueryBuilderWatermarkState;
  checkEntitlementsState: QueryBuilderCheckEntitlementsState;
  filterOperators: QueryBuilderFilterOperator[] =
    getQueryBuilderCoreFilterOperators();
  resultState: QueryBuilderResultState;
  textEditorState: QueryBuilderTextEditorState;
  unsupportedQueryState: QueryBuilderUnsupportedQueryState;
  changeHistoryState: QueryBuilderChangeHistoryState;
  isAgentChatOpened: boolean;
  showFunctionsExplorerPanel = false;
  showParametersPanel = false;
  isEditingWatermark = false;
  isCheckingEntitlments = false;
  isCalendarEnabled = false;
  isLocalModeEnabled = false;
  dataCubeViewerState: QueryBuilderDataCubeViewerState | undefined;
  INTERNAL__enableInitializingDefaultSimpleExpressionValue = false;

  lambdaWriteMode = QUERY_BUILDER_LAMBDA_WRITER_MODE.STANDARD;

  sourceElement?: Class | Accessor | undefined;
  getAllFunction: QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS =
    QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL;
  executionContextState: QueryBuilderExecutionContextState;
  internalizeState?: QueryBuilderInternalizeState | undefined;
  queryAgentChatState?: QueryAgentChatState | undefined;

  // NOTE: This property contains information about workflow used
  // to create this state. This should only be used to add additional
  // information to query builder analytics.
  sourceInfo?: QueryableSourceInfo | undefined;

  // NOTE: this makes it so that we need to import components in stores code,
  // we probably want to refactor to an extension mechanism
  TEMPORARY__setupPanelContentRenderer?: (() => React.ReactNode) | undefined;

  constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
    workflowState: QueryBuilderWorkflowState,
    config: QueryBuilderConfig | undefined,
    sourceInfo?: QueryableSourceInfo | undefined,
  ) {
    makeObservable(this, {
      explorerState: observable,
      parametersState: observable,
      constantState: observable,
      functionsExplorerState: observable,
      fetchStructureState: observable,
      filterState: observable,
      watermarkState: observable,
      milestoningState: observable,
      checkEntitlementsState: observable,
      resultState: observable,
      textEditorState: observable,
      unsupportedQueryState: observable,
      showFunctionsExplorerPanel: observable,
      showParametersPanel: observable,
      isEditingWatermark: observable,
      isCheckingEntitlments: observable,
      isCalendarEnabled: observable,
      changeDetectionState: observable,
      changeHistoryState: observable,
      executionContextState: observable,
      sourceElement: observable,
      queryAgentChatState: observable,
      isAgentChatOpened: observable,
      isLocalModeEnabled: observable,
      dataCubeViewerState: observable,
      getAllFunction: observable,
      lambdaWriteMode: observable,
      INTERNAL__enableInitializingDefaultSimpleExpressionValue: observable,

      sideBarClassName: computed,
      sourceClass: computed,
      sourceAccessor: computed,
      sourceRelationType: computed,
      isQuerySupported: computed,
      allValidationIssues: computed,
      canBuildQuery: computed,
      useRelation: computed,

      setShowFunctionsExplorerPanel: action,
      setShowParametersPanel: action,
      setIsEditingWatermark: action,
      setIsCalendarEnabled: action,
      setDataCubeViewerState: action,
      openDataCubeEngine: action,
      setIsCheckingEntitlments: action,
      setSourceElement: action,
      setIsAgentChatOpened: action,
      setIsLocalModeEnabled: action,
      setGetAllFunction: action,
      setLambdaWriteMode: action,
      setINTERNAL__enableInitializingDefaultSimpleExpressionValue: action,
      TEMPORARY_initializeExecContext: action,
      reconcileExecutionContextState: action,

      resetQueryResult: action,
      resetQueryContent: action,
      changeSourceElement: action,
      changeMapping: action,
      changeRuntime: action,
      setExecutionContextState: action,
      setQueryAgentChatState: action,

      rebuildWithQuery: action,
      compileQuery: flow,
      hashCode: computed,
    });

    this.applicationStore = applicationStore;
    this.graphManagerState = graphManagerState;
    this.executionContextState = this.TEMPORARY_initializeExecContext(
      Boolean(config?.enableTypedTDS),
    );
    this.milestoningState = new QueryBuilderMilestoningState(this);
    this.explorerState = new QueryBuilderExplorerState(this);
    this.parametersState = new QueryBuilderParametersState(this);
    this.constantState = new QueryBuilderConstantsState(this);
    this.functionsExplorerState = new QueryFunctionsExplorerState(this);
    this.fetchStructureState = new QueryBuilderFetchStructureState(this);
    this.filterState = new QueryBuilderFilterState(this, this.filterOperators);
    this.watermarkState = new QueryBuilderWatermarkState(this);
    this.checkEntitlementsState = new QueryBuilderCheckEntitlementsState(this);
    this.resultState = new QueryBuilderResultState(this);
    this.textEditorState = new QueryBuilderTextEditorState(this);
    this.unsupportedQueryState = new QueryBuilderUnsupportedQueryState(this);
    this.observerContext = new ObserverContext(
      this.graphManagerState.pluginManager.getPureGraphManagerPlugins(),
    );
    this.changeDetectionState = new QueryBuilderChangeDetectionState(this);
    this.changeHistoryState = new QueryBuilderChangeHistoryState(this);
    this.config = config;
    this.workflowState = workflowState;
    this.sourceInfo = sourceInfo;
    this.isAgentChatOpened =
      (!this.config?.TEMPORARY__disableQueryBuilderAgentChat &&
        this.applicationStore.settingService.getBooleanValue(
          QUERY_BUILDER_SETTING_KEY.SHOW_QUERY_AGENT_CHAT_PANEL,
        )) ??
      false;
  }

  TEMPORARY_initializeExecContext(
    isTypedTDS: boolean,
  ): QueryBuilderExecutionContextState {
    if (isTypedTDS) {
      this.lambdaWriteMode =
        QUERY_BUILDER_LAMBDA_WRITER_MODE.TYPED_FETCH_STRUCTURE;
      return new QueryBuilderEmbeddedFromExecutionContextState(this);
    }
    return new QueryBuilderExternalExecutionContextState(this);
  }

  get useRelation(): boolean {
    return this.sourceElement instanceof Accessor || this.isFetchStructureTyped;
  }

  get isMappingReadOnly(): boolean {
    return false;
  }

  get isRuntimeReadOnly(): boolean {
    return false;
  }

  get sideBarClassName(): string | undefined {
    return undefined;
  }

  get isParameterSupportDisabled(): boolean {
    return false;
  }

  get isResultPanelHidden(): boolean {
    return false;
  }

  get floatingExecutionElements(): PackageableElement[] | undefined {
    return undefined;
  }

  /**
   * This flag is for turning on/off DnD support from projection panel to filter panel,
   * and will be leveraged when the concepts of workflows are introduced into query builder.
   */
  get TEMPORARY__isDnDFetchStructureToFilterSupported(): boolean {
    return true;
  }

  get allVariables(): VariableExpression[] {
    const parameterVars = this.parametersState.parameterStates.map(
      (paramState) => paramState.parameter,
    );
    const letVars = this.constantState.constants.map(
      (letVar) => letVar.variable,
    );
    return [...parameterVars, ...letVars];
  }

  get allVariableNames(): string[] {
    return this.allVariables.map((e) => e.name);
  }

  get isFetchStructureTyped(): boolean {
    return (
      this.lambdaWriteMode ===
      QUERY_BUILDER_LAMBDA_WRITER_MODE.TYPED_FETCH_STRUCTURE
    );
  }

  get requiresEmbeddedExecutionContext(): boolean {
    return (
      this.isFetchStructureTyped && Boolean(this.executionContextState.mapping)
    );
  }

  get forceFromExpressionForExec(): boolean {
    return this.isFetchStructureTyped;
  }

  get requiresMappingForExecution(): boolean {
    return true;
  }

  setLambdaWriteMode(val: QUERY_BUILDER_LAMBDA_WRITER_MODE): void {
    this.lambdaWriteMode = val;
    this.reconcileExecutionContextState();
  }
  reconcileExecutionContextState(options?: {
    allowDowngrade?: boolean | undefined;
  }): void {
    const requiresEmbedded = this.requiresEmbeddedExecutionContext;
    const isEmbedded =
      this.executionContextState instanceof
      QueryBuilderEmbeddedFromExecutionContextState;
    if (requiresEmbedded === isEmbedded) {
      return;
    }
    if (isEmbedded && !options?.allowDowngrade) {
      return;
    }
    const preservedMapping = this.executionContextState.mapping;
    const preservedRuntime = this.executionContextState.runtimeValue;
    const next = requiresEmbedded
      ? new QueryBuilderEmbeddedFromExecutionContextState(this)
      : new QueryBuilderExternalExecutionContextState(this);
    next.setMapping(preservedMapping);
    next.setRuntimeValue(preservedRuntime);
    this.setExecutionContextState(next);
  }

  getQueryExecutionContext(): QueryExecutionContext {
    const queryExeContext = new QueryExplicitExecutionContext();
    const runtimeValue = guaranteeType(
      this.executionContextState.runtimeValue,
      RuntimePointer,
      'Query runtime must be of type runtime pointer',
    );
    assertNonNullable(
      this.executionContextState.mapping,
      'Query required mapping to update',
    );
    queryExeContext.mapping = PackageableElementExplicitReference.create(
      this.executionContextState.mapping,
    );
    queryExeContext.runtime = runtimeValue.packageableRuntime;
    return queryExeContext;
  }

  async propagateExecutionContextChange(
    isGraphBuildingNotRequired?: boolean,
  ): Promise<void> {
    const propagateFuncHelpers = this.applicationStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as QueryBuilder_LegendApplicationPlugin_Extension
          ).getExtraQueryBuilderPropagateExecutionContextChangeHelper?.() ?? [],
      );
    for (const helper of propagateFuncHelpers) {
      const propagateFuncHelper = helper(this, isGraphBuildingNotRequired);
      if (propagateFuncHelper) {
        await propagateFuncHelper();
        return;
      }
    }
  }

  /**
   * Aggregates extra telemetry metadata contributed by application plugins
   * via `getExtraQueryBuilderTelemetryMetadataProviders`. Callers spread the
   * result into their event payloads so telemetry helpers stay free of
   * plugin-specific fields (e.g. agent chat trace ids).
   */
  getExtraTelemetryMetadata(): Record<string, unknown> {
    const providers = this.applicationStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as QueryBuilder_LegendApplicationPlugin_Extension
          ).getExtraQueryBuilderTelemetryMetadataProviders?.() ?? [],
      );
    const metadata: Record<string, unknown> = {};
    for (const provider of providers) {
      const extra = provider(this);
      if (extra) {
        Object.assign(metadata, extra);
      }
    }
    return metadata;
  }

  /**
   * Gets the execution context the query builder has currently *resolved to*:
   * the class being queried and the mapping/runtime it will execute against.
   *
   * This is deliberately distinct from `sourceInfo`, which records what the
   * builder was *opened with* (the route). For a mapping-sourced query both are
   * populated and initially identical, so a divergence means the user switched;
   * for a data space / data product / service query only this side carries a
   * mapping and runtime, because the entry point resolves to one.
   *
   * Degrades gracefully — whichever of class / mapping / runtime are known get
   * reported, so events that fire while the user is still setting up (picking a
   * class before a mapping, say) are not blank. Returns `undefined` only when
   * none of the three has resolved.
   */
  getExecutionContextInfo(): QueryBuilderExecutionContextInfo | undefined {
    const classPath = this.sourceClass?.path;
    const mappingPath = this.executionContextState.mapping?.path;
    const runtimeValue = this.executionContextState.runtimeValue;
    const runtimePath =
      runtimeValue instanceof RuntimePointer
        ? runtimeValue.packageableRuntime.value.path
        : undefined;
    const isInlineRuntime =
      runtimeValue !== undefined && !(runtimeValue instanceof RuntimePointer);
    if (!classPath && !mappingPath && !runtimePath && !isInlineRuntime) {
      return undefined;
    }
    return {
      class: classPath,
      mapping: mappingPath,
      runtime: runtimePath,
      isInlineRuntime: isInlineRuntime ? true : undefined,
    };
  }

  /**
   * Gets a lightweight snapshot of the current query builder authoring state
   * (fetch structure kind, filter/parameter/constant counts, milestoning /
   * watermark configuration, etc.) for telemetry payloads. Kept intentionally
   * shape-only — no user values, no identifiers.
   */
  getQueryInfo(): QueryBuilderQueryInfo {
    const base: QueryBuilderQueryInfo = {
      fetchStructureType: this.fetchStructureState.implementation.type,
      parameterCount: this.parametersState.parameterStates.length,
      constantCount: this.constantState.constants.length,
      hasFilter: !this.filterState.isEmpty,
      filterNodeCount: this.filterState.nodes.size,
      watermarkEnabled: this.watermarkState.value !== undefined,
      milestoningKind: this.milestoningState.milestoningKind,
    };
    if (
      this.fetchStructureState.implementation instanceof QueryBuilderTDSState
    ) {
      const tdsState = this.fetchStructureState.implementation;
      const modifier = tdsState.resultSetModifierState;
      base.isTypedFetchStructure =
        tdsState.projectionColumns.length > 0 &&
        tdsState.projectionColumns.every(
          (col) =>
            col instanceof QueryBuilderRelationColumnProjectionColumnState,
        );
      base.projectionColumnCount = tdsState.projectionColumns.length;
      base.windowColumnCount = tdsState.windowState.windowColumns.length;
      base.aggregationColumnCount = tdsState.aggregationState.columns.length;
      base.postFilterNodeCount = tdsState.postFilterState.nodes.size;
      base.hasLimit = modifier.limit !== undefined;
      base.hasDistinct = modifier.distinct;
      base.sortColumnCount = modifier.sortColumns.length;
      base.hasSlice = modifier.slice !== undefined;
    }
    return base;
  }

  /**
   * Telemetry must never crash a user-visible action, so every `safeGet*`
   * wrapper below swallows errors from its snapshot builder (state might be
   * mid-construction, or a downstream computed getter might throw in edge
   * cases) and logs them instead of throwing.
   */
  private safeGetTelemetry<T>(getter: () => T, fallback: T, label: string): T {
    try {
      return getter();
    } catch (error) {
      this.applicationStore.logService.warn(
        LogEvent.create(APPLICATION_EVENT.GENERIC_FAILURE),
        label,
        error,
      );
      return fallback;
    }
  }

  /**
   * Builds the shared telemetry envelope every query builder event carries: the
   * entry point the builder was opened with, spread flat, plus the execution
   * context it resolved to, nested under `state`. Spread this into a payload
   * rather than assembling the two halves by hand at each callsite.
   */
  safeGetTelemetryContext(): QueryBuilderTelemetryContext {
    return this.safeGetTelemetry<QueryBuilderTelemetryContext>(
      () => ({ ...this.sourceInfo, state: this.getExecutionContextInfo() }),
      {},
      'Failed to build query builder telemetry context',
    );
  }

  /**
   * Reports that a query builder was opened, from whichever surface opened it.
   * This is the canonical "a query builder exists" signal — hosts should prefer
   * it over their own route-specific load events, which each cover only part of
   * the population.
   *
   * Deliberately called by the host once the builder is *loaded*, rather than
   * emitted from the constructor. The constructor runs before subclass field
   * initializers, so the execution context would be unresolved and the `safeGet*`
   * wrappers would silently report an empty envelope; it would also fire for
   * derived states such as {@link INTERNAL__toBasicQueryBuilderState}, which are
   * built on every data preview and are not user-facing opens.
   *
   * `extra` carries host-specific supplementary fields (load timings, and for
   * Legend Query creators `restoredFromRecent`). It is untyped to keep this
   * package host-agnostic.
   */
  logOpened(
    openedFrom: QUERY_BUILDER_OPENED_FROM,
    extra?: Record<string, unknown> | undefined,
  ): void {
    QueryBuilderTelemetryHelper.logEvent_QueryBuilderOpened(
      this.applicationStore.telemetryService,
      {
        openedFrom,
        ...this.safeGetTelemetryContext(),
        ...extra,
      },
    );
  }

  /**
   * Prefer this over the raw `getQueryInfo()` method on the hot path of
   * execution telemetry.
   */
  safeGetQueryInfo(): QueryBuilderQueryInfo | undefined {
    return this.safeGetTelemetry(
      () => this.getQueryInfo(),
      undefined,
      'Failed to build query builder telemetry query info',
    );
  }

  safeGetExtraTelemetryMetadata(): Record<string, unknown> {
    return this.safeGetTelemetry(
      () => this.getExtraTelemetryMetadata(),
      {},
      'Failed to build query builder extra telemetry metadata',
    );
  }

  setIsAgentChatOpened(val: boolean): void {
    if (val && this.config?.TEMPORARY__disableQueryBuilderAgentChat) {
      return;
    }
    this.isAgentChatOpened = val;
    this.applicationStore.settingService.persistValue(
      QUERY_BUILDER_SETTING_KEY.SHOW_QUERY_AGENT_CHAT_PANEL,
      val,
    );
  }

  setIsLocalModeEnabled(val: boolean): void {
    this.isLocalModeEnabled = val;
  }

  setDataCubeViewerState(
    val: QueryBuilderDataCubeViewerState | undefined,
  ): void {
    this.dataCubeViewerState = val;
  }

  setInternalize(val: QueryBuilderInternalizeState | undefined): void {
    this.internalizeState = val;
  }

  setQueryAgentChatState(val: QueryAgentChatState | undefined): void {
    this.queryAgentChatState = val;
  }

  setShowFunctionsExplorerPanel(val: boolean): void {
    this.showFunctionsExplorerPanel = val;
  }

  setShowParametersPanel(val: boolean): void {
    this.showParametersPanel = val;
  }

  setIsEditingWatermark(val: boolean): void {
    this.isEditingWatermark = val;
  }

  setIsCheckingEntitlments(val: boolean): void {
    this.isCheckingEntitlments = val;
  }

  setIsCalendarEnabled(val: boolean): void {
    this.isCalendarEnabled = val;
  }

  /**
   * Convenience getter that returns the class only when the source
   * type is a Class (not a RelationType). Use this in code paths
   * that are Class-specific (milestoning, explorer tree, graph-fetch, etc.).
   */
  get sourceClass(): Class | undefined {
    return this.sourceElement instanceof Accessor
      ? undefined
      : this.sourceElement;
  }

  get sourceAccessor(): Accessor | undefined {
    return this.sourceElement instanceof Accessor
      ? this.sourceElement
      : undefined;
  }

  get sourceRelationType(): RelationType | undefined {
    return this.sourceAccessor?.relationType;
  }

  setSourceElement(val: Class | Accessor | undefined): void {
    this.sourceElement = val;
  }

  setExecutionContextState(val: QueryBuilderExecutionContextState): void {
    this.executionContextState = val;
  }

  setGetAllFunction(val: QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS): void {
    this.getAllFunction = val;
  }

  setINTERNAL__enableInitializingDefaultSimpleExpressionValue(
    val: boolean,
  ): void {
    this.INTERNAL__enableInitializingDefaultSimpleExpressionValue = val;
  }

  get isQuerySupported(): boolean {
    return !this.unsupportedQueryState.rawLambda;
  }

  async openDataCubeEngine() {
    try {
      QueryBuilderTelemetryHelper.logEvent_EmbeddedDataCubeLaunched(
        this.applicationStore.telemetryService,
      );
      this.setDataCubeViewerState(
        await createDataCubeViewerStateFromQueryBuilder(this),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Unable to open data cube in query builder`,
      );
    }
  }

  registerCommands(): void {
    this.applicationStore.commandService.registerCommand({
      key: QUERY_BUILDER_COMMAND_KEY.COMPILE,
      action: () => {
        flowResult(this.compileQuery()).catch(
          this.applicationStore.alertUnhandledError,
        );
      },
    });
  }

  // Used to determine if variable is used within query
  // For places where we don't know, we will assume the variable is not used (i.e projection derivation column)
  isVariableUsed(
    variable: VariableExpression,
    options?: {
      exculdeMilestoningState: boolean;
    },
  ): boolean {
    const isVariableUsedInBody =
      this.filterState.isVariableUsed(variable) ||
      this.watermarkState.isVariableUsed(variable) ||
      this.fetchStructureState.implementation.isVariableUsed(variable);
    return options?.exculdeMilestoningState
      ? isVariableUsedInBody
      : this.milestoningState.isVariableUsed(variable) || isVariableUsedInBody;
  }

  deregisterCommands(): void {
    [QUERY_BUILDER_COMMAND_KEY.COMPILE].forEach((key) =>
      this.applicationStore.commandService.deregisterCommand(key),
    );
  }

  resetQueryResult(options?: {
    preserveResult?: boolean | undefined;
    gridConfig?: QueryGridConfig | undefined;
  }): void {
    const resultState = new QueryBuilderResultState(this);
    resultState.setPreviewLimit(this.resultState.previewLimit);
    if (options?.preserveResult) {
      resultState.setExecutionResult(this.resultState.executionResult);
      resultState.setExecutionDuration(this.resultState.executionDuration);
      resultState.latestRunHashCode = this.resultState.latestRunHashCode;
    }
    if (options?.gridConfig) {
      this.isLocalModeEnabled = true;
      resultState.handlePreConfiguredGridConfig(options.gridConfig);
    }
    this.resultState = resultState;
  }

  resetQueryContent(): void {
    this.textEditorState = new QueryBuilderTextEditorState(this);
    this.unsupportedQueryState = new QueryBuilderUnsupportedQueryState(this);
    this.milestoningState = new QueryBuilderMilestoningState(this);
    const mappingModelCoverageAnalysisResult =
      this.explorerState.mappingModelCoverageAnalysisResult;
    this.explorerState = new QueryBuilderExplorerState(this);
    if (mappingModelCoverageAnalysisResult) {
      this.explorerState.mappingModelCoverageAnalysisResult =
        mappingModelCoverageAnalysisResult;
    }
    this.explorerState.refreshTreeData();
    this.constantState = new QueryBuilderConstantsState(this);
    this.functionsExplorerState = new QueryFunctionsExplorerState(this);
    this.parametersState = new QueryBuilderParametersState(this);
    this.filterState = new QueryBuilderFilterState(this, this.filterOperators);
    this.watermarkState = new QueryBuilderWatermarkState(this);
    this.checkEntitlementsState = new QueryBuilderCheckEntitlementsState(this);
    this.isCalendarEnabled = false;

    const currentFetchStructureImplementationType =
      this.fetchStructureState.implementation.type;
    this.fetchStructureState = new QueryBuilderFetchStructureState(this);
    if (
      currentFetchStructureImplementationType !==
      this.fetchStructureState.implementation.type
    ) {
      this.fetchStructureState.changeImplementation(
        currentFetchStructureImplementationType,
      );
    }
  }

  changeSourceElement(val: Class | Accessor): void {
    this.resetQueryResult();
    this.resetQueryContent();
    this.setGetAllFunction(QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL);
    this.setSourceElement(val);
    this.explorerState.refreshTreeData();
    this.fetchStructureState.implementation.onClassChange();
    this.milestoningState.updateMilestoningConfiguration();
    this.changeHistoryState.cacheNewQuery(this.buildQuery());
  }

  changeMapping(val: Mapping, options?: { keepQueryContent?: boolean }): void {
    this.resetQueryResult();
    if (!options?.keepQueryContent) {
      this.resetQueryContent();
      this.setGetAllFunction(QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL);
      this.milestoningState.updateMilestoningConfiguration();
    }
    this.executionContextState.setMapping(val);
  }

  changeRuntime(val: Runtime): void {
    this.resetQueryResult();
    this.executionContextState.setRuntimeValue(val);
  }

  getCurrentParameterValues(): Map<string, ValueSpecification> | undefined {
    if (this.parametersState.parameterStates.length) {
      const result = new Map<string, ValueSpecification>();
      this.parametersState.parameterStates.forEach((paramState) => {
        const val = paramState.value;
        if (val) {
          result.set(paramState.variableName, val);
        }
      });
      return result;
    }
    return undefined;
  }

  getGridConfig(): QueryGridConfig | undefined {
    // for now we will only save in local mode
    if (this.isLocalModeEnabled && this.resultState.gridConfig) {
      return this.resultState.getQueryGridConfig();
    }
    return undefined;
  }

  buildQuery(options?: { keepSourceInformation: boolean }): RawLambda {
    if (!this.isQuerySupported) {
      const parameters = this.parametersState.parameterStates.map((e) =>
        this.graphManagerState.graphManager.serializeValueSpecification(
          e.parameter,
        ),
      );
      this.unsupportedQueryState.setRawLambda(
        new RawLambda(parameters, this.unsupportedQueryState.rawLambda?.body),
      );
      return guaranteeNonNullable(this.unsupportedQueryState.rawLambda);
    }
    return buildRawLambdaFromLambdaFunction(
      buildLambdaFunction(this, {
        keepSourceInformation: Boolean(options?.keepSourceInformation),
        useTypedRelationFunctions: this.isFetchStructureTyped,
      }),
      this.graphManagerState,
    );
  }

  /**
   * Builds the raw lambda intended for persistence (saving to query store).
   * The default implementation delegates to buildQuery(). Subclasses that embed
   * execution context inside the lambda body (e.g. DataProductQueryBuilderState)
   * should override this to return a plain lambda without that wrapping, since
   * the execution context is persisted separately via query.executionContext.
   */
  buildQueryForPersistence(): RawLambda {
    return this.buildQuery();
  }

  protected buildQueryLambdaWithoutExecutionContext(): RawLambda {
    if (!this.isQuerySupported) {
      return this.buildQuery();
    }
    return buildRawLambdaFromLambdaFunction(
      buildLambdaFunction(this, {
        skipExecutionContext: true,
        useTypedRelationFunctions: this.isFetchStructureTyped,
      }),
      this.graphManagerState,
    );
  }

  buildFromQuery(): RawLambda {
    assertTrue(
      this.isQuerySupported,
      'Query must be supported to build from function',
    );
    const mapping = guaranteeNonNullable(
      this.executionContextState.mapping,
      'Mapping required to build from() function',
    );
    const runtime = guaranteeNonNullable(
      this.executionContextState.runtimeValue,
      'Runtime required to build from query',
    );
    const runtimePointer = guaranteeType(
      runtime,
      RuntimePointer,
    ).packageableRuntime;
    const lambdaFunc = buildLambdaFunction(this);
    const fromQuery = attachFromQuery(
      lambdaFunc,
      mapping,
      runtimePointer.value,
    );
    return buildRawLambdaFromLambdaFunction(fromQuery, this.graphManagerState);
  }

  /**
   * Builds the execution context expression (e.g. from()) for the lambda function.
   * Subclasses can override this to customize the execution context building.
   */
  buildExecutionContextExpression(
    lambdaFunction: LambdaFunction,
  ): LambdaFunction {
    return buildExecutionContextState(
      this.executionContextState,
      lambdaFunction,
    );
  }

  getQueryReturnType(): Type {
    if (
      this.fetchStructureState.implementation instanceof QueryBuilderTDSState
    ) {
      return this.useRelation
        ? this.graphManagerState.graph.getType(QUERY_BUILDER_PURE_PATH.RELATION)
        : this.graphManagerState.graph.getClass(
            QUERY_BUILDER_PURE_PATH.TDS_TABULAR_DATASET,
          );
    }
    return PrimitiveType.STRING;
  }

  initializeWithQuery(
    query: RawLambda,
    defaultParameterValues?: Map<string, ValueSpecification>,
    gridConfig?: QueryGridConfig,
  ): void {
    this.rebuildWithQuery(query, {
      defaultParameterValues,
    });
    this.resetQueryResult({ gridConfig });
    this.changeDetectionState.initialize(query);
    this.changeHistoryState.initialize(query);
  }

  /**
   * Process the provided query, and rebuild the query builder state.
   */
  rebuildWithQuery(
    query: RawLambda,
    options?: {
      preserveParameterValues?: boolean | undefined;
      preserveResult?: boolean | undefined;
      defaultParameterValues?: Map<string, ValueSpecification> | undefined;
    },
  ): void {
    let previousStateParameterValues:
      | Map<string, QueryBuilderParameterValue>
      | undefined = undefined;
    try {
      const paramValues = new Map<string, QueryBuilderParameterValue>();
      if (options?.preserveParameterValues) {
        this.parametersState.parameterStates.forEach((ps) => {
          paramValues.set(ps.parameter.name, {
            variable: ps.parameter,
            value: ps.value,
          });
        });
        previousStateParameterValues = paramValues;
      } else if (options?.defaultParameterValues?.size) {
        Array.from(options.defaultParameterValues.entries()).forEach(
          ([k, v]) => {
            paramValues.set(k, {
              variable: k,
              value: v,
            });
          },
        );
        previousStateParameterValues = paramValues;
      }
      this.resetQueryResult({ preserveResult: options?.preserveResult });
      this.resetQueryContent();
      if (!isStubbed_RawLambda(query)) {
        const valueSpec = observe_ValueSpecification(
          this.graphManagerState.graphManager.buildValueSpecification(
            this.graphManagerState.graphManager.serializeRawValueSpecification(
              query,
            ),
            this.graphManagerState.graph,
          ),
          this.observerContext,
        );
        const compiledValueSpecification = guaranteeType(
          valueSpec,
          LambdaFunctionInstanceValue,
          `Can't build query state: query builder only support lambda`,
        );
        processQueryLambdaFunction(
          guaranteeNonNullable(compiledValueSpecification.values[0]),
          this,
          {
            parameterValues: previousStateParameterValues,
          },
        );
      }
      if (
        this.parametersState.parameterStates.filter(
          (paramState) =>
            !this.milestoningState.isMilestoningParameter(paramState.parameter),
        ).length > 0
      ) {
        this.setShowParametersPanel(true);
      }
      this.fetchStructureState.initializeWithQuery();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(QUERY_BUILDER_EVENT.UNSUPPORTED_QUERY_LAUNCH),
        error,
      );
      this.resetQueryResult({ preserveResult: options?.preserveResult });
      this.resetQueryContent();
      this.unsupportedQueryState.setLambdaError(error);
      this.unsupportedQueryState.setRawLambda(query);
      this.setSourceElement(undefined);
      const parameters = buildLambdaVariableExpressions(
        query,
        this.graphManagerState,
      )
        .map((param) => observe_ValueSpecification(param, this.observerContext))
        .filter(filterByType(VariableExpression));
      processParameters(parameters, this, {
        parameterValues: previousStateParameterValues,
      });
    }
  }

  *compileQuery(): GeneratorFn<void> {
    if (!this.textEditorState.mode) {
      this.queryCompileState.inProgress();
      this.fetchStructureState.implementation.clearCompilationError();
      // form mode
      try {
        this.textEditorState.setCompilationError(undefined);
        // NOTE: retain the source information on the lambda in order to be able
        // to pin-point compilation issue in form mode
        (yield this.graphManagerState.graphManager.getLambdaReturnType(
          this.buildQuery({ keepSourceInformation: true }),
          this.graphManagerState.graph,
          { keepSourceInformation: true },
        )) as string;
        this.applicationStore.notificationService.notifySuccess(
          'Compiled successfully',
        );
      } catch (error) {
        assertErrorThrown(error);
        this.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.COMPILATION_FAILURE),
          error,
        );
        let fallbackToTextModeForDebugging = true;
        // if compilation failed, we try to reveal the error in form mode,
        // if even this fail, we will fall back to show it in text mode
        if (error instanceof CompilationError && error.sourceInformation) {
          fallbackToTextModeForDebugging =
            !this.fetchStructureState.implementation.revealCompilationError(
              error,
            );
        }

        // decide if we need to fall back to text mode for debugging
        if (fallbackToTextModeForDebugging) {
          this.applicationStore.notificationService.notifyWarning(
            'Compilation failed and error cannot be located in form mode. Redirected to text mode for debugging.',
          );
          this.textEditorState.openModal(QueryBuilderTextEditorMode.TEXT);
          // TODO: trigger another compilation to pin-point the issue
          // since we're using the lambda editor right now, we are a little bit limitted
          // in terms of the timing to do compilation (since we're using an `useEffect` to
          // convert the lambda to grammar text), we might as well wait for the refactor
          // of query builder text-mode
          // See https://github.com/finos/legend-studio/issues/319
        } else {
          this.applicationStore.notificationService.notifyWarning(
            `Compilation failed: ${error.message}`,
          );
        }
      } finally {
        this.queryCompileState.complete();
      }
    } else if (this.textEditorState.mode === QueryBuilderTextEditorMode.TEXT) {
      this.queryCompileState.inProgress();
      try {
        this.textEditorState.setCompilationError(undefined);
        (yield this.graphManagerState.graphManager.getLambdaReturnType(
          this.textEditorState.rawLambdaState.lambda,
          this.graphManagerState.graph,
          { keepSourceInformation: true },
        )) as string;
        this.applicationStore.notificationService.notifySuccess(
          'Compiled successfully',
        );
      } catch (error) {
        assertErrorThrown(error);
        if (error instanceof CompilationError) {
          this.applicationStore.logService.error(
            LogEvent.create(GRAPH_MANAGER_EVENT.COMPILATION_FAILURE),
            error,
          );
          this.applicationStore.notificationService.notifyWarning(
            `Compilation failed: ${error.message}`,
            error.trace,
          );
          const errorElementCoordinates = extractSourceInformationCoordinates(
            error.sourceInformation,
          );
          if (errorElementCoordinates) {
            this.textEditorState.setCompilationError(error);
          }
        }
      } finally {
        this.queryCompileState.complete();
      }
    }
  }

  get allValidationIssues(): string[] {
    return this.fetchStructureState.implementation.allValidationIssues.concat(
      this.filterState.allValidationIssues,
    );
  }

  get canBuildQuery(): boolean {
    return (
      !this.filterState.hasInvalidFilterValues &&
      !this.filterState.hasInvalidDerivedPropertyParameters &&
      !this.fetchStructureState.implementation.hasInvalidFilterValues &&
      !this.fetchStructureState.implementation
        .hasInvalidDerivedPropertyParameters
    );
  }

  buildFunctionAnalysisInfo():
    | QueryBuilderExtraFunctionAnalysisInfo
    | undefined {
    return undefined;
  }

  getGraphData(): GraphData {
    return new InMemoryGraphData(this.graphManagerState.graph);
  }

  /**
   * This method can be used to simplify the current query builder state
   * to a basic one that can be used for testing or some special operations,
   * see {@link INTERNAL__BasicQueryBuilderState} for more details
   */
  INTERNAL__toBasicQueryBuilderState(): QueryBuilderState {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const basicState = new INTERNAL__BasicQueryBuilderState(
      this.applicationStore,
      this.graphManagerState,
      this.workflowState,
      undefined,
    );
    basicState.sourceElement = this.sourceElement;
    basicState.executionContextState.mapping =
      this.executionContextState.mapping;
    basicState.executionContextState.runtimeValue =
      this.executionContextState.runtimeValue;
    return basicState;
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.QUERY_BUILDER_STATE,
      this.unsupportedQueryState,
      this.milestoningState,
      this.parametersState,
      this.filterState,
      this.watermarkState,
      this.checkEntitlementsState,
      this.fetchStructureState.implementation,
    ]);
  }
}

/**
 * Base query builder state with result panel hidden.
 * This is useful for scenarios where the query builder is used
 * only for query construction without execution/result display.
 */
export abstract class BaseQueryBuilderState extends QueryBuilderState {
  override get isResultPanelHidden(): boolean {
    return true;
  }
}

/**
 * This type is used for testing and analytics operation in query builder.
 * For example, we use this to build the preview data lambda, or to build the auto-complete lambda
 * in filters.
 *
 * NOTE: The latter is quite clever since query-builder itself is used to build the lambda (i.e. dogfooding),
 * unfortunately, it creates a circular dependency between QueryBuilderState and PreviewData/AutoComplete
 *
 * @internal
 */
export class INTERNAL__BasicQueryBuilderState extends QueryBuilderState {}
