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
  type ValueSpecification,
  type Type,
  type QueryGridConfig,
  type QueryExecutionContext,
  type FunctionAnalysisInfo,
  type GraphData,
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
} from '@finos/legend-graph';
import { buildLambdaFunction } from './QueryBuilderValueSpecificationBuilder.js';
import type {
  CommandRegistrar,
  GenericLegendApplicationStore,
} from '@finos/legend-application';
import { QueryFunctionsExplorerState } from './explorer/QueryFunctionsExplorerState.js';
import {
  QueryBuilderParametersState,
  type QueryBuilderParameterValue,
} from './QueryBuilderParametersState.js';
import type { QueryBuilderFilterOperator } from './filter/QueryBuilderFilterOperator.js';
import { getQueryBuilderCoreFilterOperators } from './filter/QueryBuilderFilterOperatorLoader.js';
import { QueryBuilderChangeDetectionState } from './QueryBuilderChangeDetectionState.js';
import { QueryBuilderMilestoningState } from './milestoning/QueryBuilderMilestoningState.js';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from './QueryBuilderStateHashUtils.js';
import { QUERY_BUILDER_COMMAND_KEY } from './QueryBuilderCommand.js';
import { QueryBuilderWatermarkState } from './watermark/QueryBuilderWatermarkState.js';
import { QueryBuilderConstantsState } from './QueryBuilderConstantsState.js';
import { QueryBuilderCheckEntitlementsState } from './entitlements/QueryBuilderCheckEntitlementsState.js';
import { QueryBuilderTDSState } from './fetch-structure/tds/QueryBuilderTDSState.js';
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
import { QUERY_BUILDER_EVENT } from '../__lib__/QueryBuilderEvent.js';
import { QUERY_BUILDER_SETTING_KEY } from '../__lib__/QueryBuilderSetting.js';
import { QueryBuilderChangeHistoryState } from './QueryBuilderChangeHistoryState.js';
import { type QueryBuilderWorkflowState } from './query-workflow/QueryBuilderWorkFlowState.js';
import { type QueryChatState } from './QueryChatState.js';
import type { QueryBuilder_LegendApplicationPlugin_Extension } from './QueryBuilder_LegendApplicationPlugin_Extension.js';
import { createDataCubeViewerStateFromQueryBuilder } from './data-cube/QueryBuilderDataCubeHelper.js';
import type { QueryBuilderDataCubeViewerState } from './data-cube/QueryBuilderDataCubeViewerState.js';
import { QueryBuilderTelemetryHelper } from '../__lib__/QueryBuilderTelemetryHelper.js';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface QueryableSourceInfo {}

export type QueryableClassMappingRuntimeInfo = QueryableSourceInfo & {
  class: string;
  mapping: string;
  runtime: string;
};

export type QueryBuilderExtraFunctionAnalysisInfo = {
  functionInfoMap: Map<string, FunctionAnalysisInfo>;
  dependencyFunctionInfoMap: Map<string, FunctionAnalysisInfo>;
};

export enum QUERY_BUILDER_LAMBDA_WRITER_MODE {
  STANDARD = 'STANDARD',
  TYPED_FETCH_STRUCTURE = 'TYPED_FETCH_STRUCTURE',
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
  isQueryChatOpened: boolean;
  showFunctionsExplorerPanel = false;
  showParametersPanel = false;
  isEditingWatermark = false;
  isCheckingEntitlments = false;
  isCalendarEnabled = false;
  isLocalModeEnabled = false;
  dataCubeViewerState: QueryBuilderDataCubeViewerState | undefined;
  INTERNAL__enableInitializingDefaultSimpleExpressionValue = false;

  lambdaWriteMode = QUERY_BUILDER_LAMBDA_WRITER_MODE.STANDARD;

  class?: Class | undefined;
  getAllFunction: QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS =
    QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL;
  executionContextState: QueryBuilderExecutionContextState;
  internalizeState?: QueryBuilderInternalizeState | undefined;
  queryChatState?: QueryChatState | undefined;

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
      class: observable,
      queryChatState: observable,
      isQueryChatOpened: observable,
      isLocalModeEnabled: observable,
      dataCubeViewerState: observable,
      getAllFunction: observable,
      lambdaWriteMode: observable,
      INTERNAL__enableInitializingDefaultSimpleExpressionValue: observable,

      sideBarClassName: computed,
      isQuerySupported: computed,
      allValidationIssues: computed,
      canBuildQuery: computed,

      setShowFunctionsExplorerPanel: action,
      setShowParametersPanel: action,
      setIsEditingWatermark: action,
      setIsCalendarEnabled: action,
      setDataCubeViewerState: action,
      openDataCubeEngine: action,
      setIsCheckingEntitlments: action,
      setClass: action,
      setIsQueryChatOpened: action,
      setIsLocalModeEnabled: action,
      setGetAllFunction: action,
      setLambdaWriteMode: action,
      setINTERNAL__enableInitializingDefaultSimpleExpressionValue: action,
      TEMPORARY_initializeExecContext: action,

      resetQueryResult: action,
      resetQueryContent: action,
      changeClass: action,
      changeMapping: action,
      setExecutionContextState: action,
      setQueryChatState: action,

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
    this.isQueryChatOpened =
      (!this.config?.TEMPORARY__disableQueryBuilderChat &&
        this.applicationStore.settingService.getBooleanValue(
          QUERY_BUILDER_SETTING_KEY.SHOW_QUERY_CHAT_PANEL,
        )) ??
      false;
  }

  TEMPORARY_initializeExecContext(
    isTypedTDS: boolean,
  ): QueryBuilderExecutionContextState {
    if (isTypedTDS) {
      const context = new QueryBuilderEmbeddedFromExecutionContextState(this);
      this.setLambdaWriteMode(
        QUERY_BUILDER_LAMBDA_WRITER_MODE.TYPED_FETCH_STRUCTURE,
      );
      return context;
    }
    return new QueryBuilderExternalExecutionContextState(this);
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

  setLambdaWriteMode(val: QUERY_BUILDER_LAMBDA_WRITER_MODE): void {
    this.lambdaWriteMode = val;
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
   * Gets information about the current queryBuilderState.
   * This information can be used as a part of analytics
   */
  getStateInfo(): QueryableClassMappingRuntimeInfo | undefined {
    if (this.sourceInfo) {
      const classPath = this.class?.path;
      const mappingPath = this.executionContextState.mapping?.path;
      const runtimePath =
        this.executionContextState.runtimeValue instanceof RuntimePointer
          ? this.executionContextState.runtimeValue.packageableRuntime.value
              .path
          : undefined;
      if (classPath && mappingPath && runtimePath) {
        const contextInfo = {
          class: classPath,
          mapping: mappingPath,
          runtime: runtimePath,
        };
        return Object.assign({}, this.sourceInfo, contextInfo);
      }
    }
    return undefined;
  }

  setIsQueryChatOpened(val: boolean): void {
    this.isQueryChatOpened = val;
    this.applicationStore.settingService.persistValue(
      QUERY_BUILDER_SETTING_KEY.SHOW_QUERY_CHAT_PANEL,
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

  setQueryChatState(val: QueryChatState | undefined): void {
    this.queryChatState = val;
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

  setClass(val: Class | undefined): void {
    this.class = val;
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

  changeClass(val: Class): void {
    this.resetQueryResult();
    this.resetQueryContent();
    this.setGetAllFunction(QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL);
    this.setClass(val);
    this.explorerState.refreshTreeData();
    this.fetchStructureState.implementation.onClassChange(val);
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

  getQueryReturnType(): Type {
    if (
      this.fetchStructureState.implementation instanceof QueryBuilderTDSState
    ) {
      const lambdaWriteMode = this.lambdaWriteMode;
      return lambdaWriteMode === QUERY_BUILDER_LAMBDA_WRITER_MODE.STANDARD
        ? this.graphManagerState.graph.getClass(
            QUERY_BUILDER_PURE_PATH.TDS_TABULAR_DATASET,
          )
        : this.graphManagerState.graph.getType(
            QUERY_BUILDER_PURE_PATH.RELATION,
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
      this.setClass(undefined);
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
    basicState.class = this.class;
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
