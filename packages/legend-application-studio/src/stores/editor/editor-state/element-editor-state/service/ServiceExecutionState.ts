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

import { observable, action, flow, makeObservable, flowResult } from 'mobx';
import {
  type GeneratorFn,
  assertErrorThrown,
  LogEvent,
  stringifyLosslessJSON,
  UnsupportedOperationError,
  filterByType,
  guaranteeNonNullable,
  StopWatch,
} from '@finos/legend-shared';
import type { ServiceEditorState } from './ServiceEditorState.js';
import {
  decorateRuntimeWithNewMapping,
  RuntimeEditorState,
} from '../../../editor-state/element-editor-state/RuntimeEditorState.js';
import {
  type ServiceExecution,
  type PureExecution,
  type Mapping,
  type Runtime,
  type PackageableRuntime,
  type RawExecutionPlan,
  type PackageableElementReference,
  type QueryInfo,
  type LightQuery,
  type ExecutionResultWithMetadata,
  type Service,
  PureSingleExecution,
  PureMultiExecution,
  KeyedExecutionParameter,
  GRAPH_MANAGER_EVENT,
  RawLambda,
  EngineRuntime,
  RuntimePointer,
  PackageableElementExplicitReference,
  buildSourceInformationSourceId,
  QueryProjectCoordinates,
  buildLambdaVariableExpressions,
  observe_ValueSpecification,
  VariableExpression,
  stub_PackageableRuntime,
  stub_Mapping,
  reportGraphAnalytics,
  QuerySearchSpecification,
} from '@finos/legend-graph';
import { parseGACoordinates } from '@finos/legend-storage';
import { runtime_addMapping } from '../../../../graph-modifier/DSL_Mapping_GraphModifierHelper.js';
import type { EditorStore } from '../../../EditorStore.js';
import {
  keyedExecutionParameter_setKey,
  pureExecution_setFunction,
  pureMultiExecution_addExecutionParameter,
  pureMultiExecution_deleteExecutionParameter,
  pureMultiExecution_setExecutionKey,
  pureSingleExecution_setMapping,
  pureSingleExecution_setRuntime,
  service_setExecution,
} from '../../../../graph-modifier/DSL_Service_GraphModifierHelper.js';
import {
  buildExecutionParameterValues,
  getExecutionQueryFromRawLambda,
  LambdaEditorState,
  LambdaParametersState,
  LambdaParameterState,
  PARAMETER_SUBMIT_ACTION,
  QueryBuilderTelemetryHelper,
  QueryLoaderState,
  QUERY_BUILDER_EVENT,
  ExecutionPlanState,
  QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT,
  getRawLambdaForLetFuncs,
} from '@finos/legend-query-builder';
import { DEFAULT_TAB_SIZE } from '@finos/legend-application';
import { openDataCube } from '../../../data-cube/LegendStudioDataCubeHelper.js';

export class ServiceExecutionParametersState extends LambdaParametersState {
  executionState: ServicePureExecutionState;

  constructor(executionState: ServicePureExecutionState) {
    super();
    makeObservable(this, {
      parameterValuesEditorState: observable,
      parameterStates: observable,
      addParameter: action,
      removeParameter: action,
      openModal: action,
      build: action,
      setParameters: action,
    });
    this.executionState = executionState;
  }

  openModal(query: RawLambda): void {
    this.parameterStates = this.build(query);
    this.parameterValuesEditorState.open(
      (): Promise<void> =>
        flowResult(this.executionState.runQuery()).catch(
          this.executionState.editorStore.applicationStore.alertUnhandledError,
        ),
      PARAMETER_SUBMIT_ACTION.RUN,
    );
  }

  openDataCubeModal(
    query: RawLambda,
    element: Service,
    editorStore: EditorStore,
  ): void {
    this.parameterStates = this.build(query);
    this.parameterValuesEditorState.open(
      (): Promise<void> =>
        this.executionState
          .openingDataCube(element, editorStore)
          .catch(
            this.executionState.editorStore.applicationStore
              .alertUnhandledError,
          ),
      PARAMETER_SUBMIT_ACTION.RUN,
    );
  }

  build(query: RawLambda): LambdaParameterState[] {
    const parameters = buildLambdaVariableExpressions(
      query,
      this.executionState.editorStore.graphManagerState,
    )
      .map((p) =>
        observe_ValueSpecification(
          p,
          this.executionState.editorStore.changeDetectionState.observerContext,
        ),
      )
      .filter(filterByType(VariableExpression));
    const states = parameters.map((p) => {
      const parmeterState = new LambdaParameterState(
        p,
        this.executionState.editorStore.changeDetectionState.observerContext,
        this.executionState.editorStore.graphManagerState.graph,
      );
      parmeterState.mockParameterValue();
      return parmeterState;
    });
    return states;
  }
}

export abstract class ServiceExecutionState {
  readonly editorStore: EditorStore;
  readonly serviceEditorState: ServiceEditorState;
  readonly execution: ServiceExecution;

  constructor(
    editorStore: EditorStore,
    serviceEditorState: ServiceEditorState,
    execution: ServiceExecution,
  ) {
    makeObservable(this, {
      execution: observable,
    });

    this.editorStore = editorStore;
    this.execution = execution;
    this.serviceEditorState = serviceEditorState;
  }

  abstract get serviceExecutionParameters():
    | { query: RawLambda; mapping: Mapping; runtime: Runtime }
    | undefined;
}

export class UnsupportedServiceExecutionState extends ServiceExecutionState {
  get serviceExecutionParameters():
    | { query: RawLambda; mapping: Mapping; runtime: Runtime }
    | undefined {
    return undefined;
  }
}

const decorateSearchSpecificationForServiceQueryImporter = (
  val: QuerySearchSpecification,
  editorStore: EditorStore,
): QuerySearchSpecification => {
  const currentProjectCoordinates = new QueryProjectCoordinates();
  currentProjectCoordinates.groupId =
    editorStore.projectConfigurationEditorState.currentProjectConfiguration.groupId;
  currentProjectCoordinates.artifactId =
    editorStore.projectConfigurationEditorState.currentProjectConfiguration.artifactId;
  val.projectCoordinates = [
    // either get queries for the current project
    currentProjectCoordinates,
    // or any of its dependencies
    ...Array.from(
      editorStore.graphManagerState.graph.dependencyManager.projectDependencyModelsIndex.keys(),
    ).map((dependencyKey) => {
      const { groupId, artifactId } = parseGACoordinates(dependencyKey);
      const coordinates = new QueryProjectCoordinates();
      coordinates.groupId = groupId;
      coordinates.artifactId = artifactId;
      return coordinates;
    }),
  ];
  return val;
};

export class ServicePureExecutionQueryState extends LambdaEditorState {
  readonly editorStore: EditorStore;
  readonly queryLoaderState: QueryLoaderState;

  execution: PureExecution;
  isInitializingLambda = false;

  constructor(editorStore: EditorStore, execution: PureExecution) {
    super('', '');

    makeObservable(this, {
      execution: observable,
      isInitializingLambda: observable,
      setIsInitializingLambda: action,
      setLambda: action,
      updateLamba: flow,
      importQuery: flow,
    });

    this.editorStore = editorStore;
    this.execution = execution;
    this.queryLoaderState = new QueryLoaderState(
      editorStore.applicationStore,
      editorStore.graphManagerState.graphManager,
      {
        loadQuery: (query: LightQuery): void => {
          flowResult(this.importQuery(query.id)).catch(
            this.editorStore.applicationStore.alertUnhandledError,
          );
        },
        decorateSearchSpecification: (val) =>
          decorateSearchSpecificationForServiceQueryImporter(
            val,
            this.editorStore,
          ),
        fetchDefaultQueries: async (): Promise<LightQuery[]> => {
          const searchSpecification = new QuerySearchSpecification();
          searchSpecification.limit = QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT;
          return this.editorStore.graphManagerState.graphManager.searchQueries(
            decorateSearchSpecificationForServiceQueryImporter(
              searchSpecification,
              this.editorStore,
            ),
          );
        },
        isReadOnly: true,
      },
    );
  }

  get lambdaId(): string {
    return buildSourceInformationSourceId([
      this.execution._OWNER.path,
      'execution',
    ]);
  }

  get query(): RawLambda {
    return this.execution.func;
  }

  setIsInitializingLambda(val: boolean): void {
    this.isInitializingLambda = val;
  }

  setLambda(val: RawLambda): void {
    pureExecution_setFunction(this.execution, val);
  }

  *importQuery(selectedQueryID: string): GeneratorFn<void> {
    try {
      const content =
        (yield this.editorStore.graphManagerState.graphManager.prettyLambdaContent(
          (
            (yield this.editorStore.graphManagerState.graphManager.getQueryInfo(
              selectedQueryID,
            )) as QueryInfo
          ).content,
        )) as string;
      const lambda =
        (yield this.editorStore.graphManagerState.graphManager.pureCodeToLambda(
          content,
        )) as RawLambda;
      yield flowResult(this.updateLamba(lambda));
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.queryLoaderState.setQueryLoaderDialogOpen(false);
    }
  }

  *updateLamba(val: RawLambda): GeneratorFn<void> {
    this.setLambda(val);
    yield flowResult(this.convertLambdaObjectToGrammarString({ pretty: true }));
  }

  *convertLambdaObjectToGrammarString(options?: {
    pretty?: boolean | undefined;
  }): GeneratorFn<void> {
    if (this.execution.func.body) {
      try {
        const lambdas = new Map<string, RawLambda>();
        lambdas.set(
          this.lambdaId,
          new RawLambda(
            this.execution.func.parameters,
            this.execution.func.body,
          ),
        );
        const isolatedLambdas =
          (yield this.editorStore.graphManagerState.graphManager.lambdasToPureCode(
            lambdas,
            options?.pretty,
          )) as Map<string, string>;
        const grammarText = isolatedLambdas.get(this.lambdaId);
        this.setLambdaString(
          grammarText !== undefined
            ? this.extractLambdaString(grammarText)
            : '',
        );
        this.clearErrors();
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
      }
    } else {
      this.clearErrors();
      this.setLambdaString('');
    }
  }

  // NOTE: since we don't allow edition in text mode, we don't need to implement this
  *convertLambdaGrammarStringToObject(): GeneratorFn<void> {
    throw new UnsupportedOperationError();
  }
}

export interface ServiceExecutionContext {
  mapping: PackageableElementReference<Mapping>;
  runtime: Runtime;
}

export abstract class ServiceExecutionContextState {
  executionState: ServiceExecutionState;

  constructor(executionState: ServiceExecutionState) {
    this.executionState = executionState;
  }

  abstract get executionContext(): ServiceExecutionContext;
  abstract setMapping(value: Mapping): void;
  abstract setRuntime(value: Runtime): void;
}

export class SingleExecutionContextState extends ServiceExecutionContextState {
  declare executionState: SingleServicePureExecutionState;

  constructor(executionState: SingleServicePureExecutionState) {
    super(executionState);
    makeObservable(this, {
      setMapping: action,
      setRuntime: action,
    });
    this.executionState = executionState;
  }

  setMapping(value: Mapping): void {
    pureSingleExecution_setMapping(
      this.executionState.execution,
      value,
      this.executionState.editorStore.changeDetectionState.observerContext,
    );
  }
  setRuntime(value: Runtime): void {
    pureSingleExecution_setRuntime(
      this.executionState.execution,
      value,
      this.executionState.editorStore.changeDetectionState.observerContext,
    );
  }

  get executionContext(): ServiceExecutionContext {
    return {
      mapping: guaranteeNonNullable(this.executionState.execution.mapping),
      runtime: guaranteeNonNullable(this.executionState.execution.runtime),
    };
  }
}

export class KeyedExecutionContextState extends ServiceExecutionContextState {
  keyedExecutionParameter: KeyedExecutionParameter;

  constructor(
    keyedExecutionParameter: KeyedExecutionParameter,
    executionState: MultiServicePureExecutionState,
  ) {
    super(executionState);
    makeObservable(this, {
      setMapping: action,
      setRuntime: action,
    });
    this.keyedExecutionParameter = keyedExecutionParameter;
  }

  setMapping(value: Mapping): void {
    pureSingleExecution_setMapping(
      this.keyedExecutionParameter,
      value,
      this.executionState.editorStore.changeDetectionState.observerContext,
    );
  }

  setRuntime(value: Runtime): void {
    pureSingleExecution_setRuntime(
      this.keyedExecutionParameter,
      value,
      this.executionState.editorStore.changeDetectionState.observerContext,
    );
  }

  get executionContext(): ServiceExecutionContext {
    return this.keyedExecutionParameter;
  }
}

export abstract class ServicePureExecutionState extends ServiceExecutionState {
  declare execution: PureExecution;
  queryState: ServicePureExecutionQueryState;
  selectedExecutionContextState: ServiceExecutionContextState | undefined;
  runtimeEditorState?: RuntimeEditorState | undefined;
  isOpeningQueryEditor = false;
  showChangeExecModal = false;
  isRunningQuery = false;
  isGeneratingPlan = false;
  executionResultText?: string | undefined; // NOTE: stored as lossless JSON string
  executionPlanState: ExecutionPlanState;
  readonly parametersState: ServiceExecutionParametersState;
  queryRunPromise: Promise<ExecutionResultWithMetadata> | undefined = undefined;

  constructor(
    editorStore: EditorStore,
    serviceEditorState: ServiceEditorState,
    execution: PureExecution,
  ) {
    super(editorStore, serviceEditorState, execution);
    makeObservable(this, {
      cancelQuery: flow,
    });

    this.execution = execution;
    this.queryState = new ServicePureExecutionQueryState(
      this.editorStore,
      execution,
    );
    this.executionPlanState = new ExecutionPlanState(
      this.editorStore.applicationStore,
      this.editorStore.graphManagerState,
    );
    this.parametersState = new ServiceExecutionParametersState(this);
  }

  abstract changeExecution(): void;

  isChangeExecutionDisabled(): boolean {
    return false;
  }

  setIsRunningQuery(val: boolean): void {
    this.isRunningQuery = val;
  }

  setShowChangeExecModal(val: boolean): void {
    this.showChangeExecModal = val;
  }

  setOpeningQueryEditor(val: boolean): void {
    this.isOpeningQueryEditor = val;
  }

  setExecutionResultText = (executionResult: string | undefined): void => {
    this.executionResultText = executionResult;
  };

  setQueryState = (queryState: ServicePureExecutionQueryState): void => {
    this.queryState = queryState;
  };

  setQueryRunPromise = (
    promise: Promise<ExecutionResultWithMetadata> | undefined,
  ): void => {
    this.queryRunPromise = promise;
  };

  async handleOpeningDataCube(
    element: Service,
    editorStore: EditorStore,
  ): Promise<void> {
    const query = this.queryState.query;
    const parameters = (query.parameters ?? []) as object[];
    if (parameters.length) {
      this.parametersState.openDataCubeModal(query, element, editorStore);
    } else {
      await openDataCube(element, editorStore);
    }
  }

  async openingDataCube(
    element: Service,
    editorStore: EditorStore,
  ): Promise<void> {
    const params = buildExecutionParameterValues(
      this.parametersState.parameterStates,
      this.editorStore.graphManagerState,
    );

    const letFuncsRawLambda = getRawLambdaForLetFuncs(
      this.parametersState.parameterStates,
      this.editorStore.graphManagerState,
    );

    await openDataCube(element, editorStore, params, letFuncsRawLambda);
  }

  *generatePlan(debug: boolean): GeneratorFn<void> {
    if (this.isGeneratingPlan) {
      return;
    }
    try {
      const query = this.queryState.query;
      this.isGeneratingPlan = true;
      let rawPlan: RawExecutionPlan;

      const stopWatch = new StopWatch();
      const report = reportGraphAnalytics(
        this.editorStore.graphManagerState.graph,
      );

      if (debug) {
        QueryBuilderTelemetryHelper.logEvent_ExecutionPlanDebugLaunched(
          this.editorStore.applicationStore.telemetryService,
        );
        const debugResult =
          (yield this.editorStore.graphManagerState.graphManager.debugExecutionPlanGeneration(
            query,
            this.selectedExecutionContextState?.executionContext.mapping.value,
            this.selectedExecutionContextState?.executionContext.runtime,
            this.editorStore.graphManagerState.graph,
            report,
          )) as { plan: RawExecutionPlan; debug: string };
        rawPlan = debugResult.plan;
        this.executionPlanState.setDebugText(debugResult.debug);
      } else {
        QueryBuilderTelemetryHelper.logEvent_ExecutionPlanGenerationLaunched(
          this.editorStore.applicationStore.telemetryService,
        );
        rawPlan =
          (yield this.editorStore.graphManagerState.graphManager.generateExecutionPlan(
            query,
            this.selectedExecutionContextState?.executionContext.mapping.value,
            this.selectedExecutionContextState?.executionContext.runtime,
            this.editorStore.graphManagerState.graph,
            report,
          )) as object;
      }

      stopWatch.record();
      try {
        this.executionPlanState.setRawPlan(rawPlan);
        const plan =
          this.editorStore.graphManagerState.graphManager.buildExecutionPlan(
            rawPlan,
            this.editorStore.graphManagerState.graph,
          );
        this.executionPlanState.initialize(plan);
      } catch {
        // do nothing
      }
      stopWatch.record(QUERY_BUILDER_EVENT.BUILD_EXECUTION_PLAN__SUCCESS);

      // report
      report.timings =
        this.editorStore.applicationStore.timeService.finalizeTimingsRecord(
          stopWatch,
          report.timings,
        );
      if (debug) {
        QueryBuilderTelemetryHelper.logEvent_ExecutionPlanDebugSucceeded(
          this.editorStore.applicationStore.telemetryService,
          report,
        );
      } else {
        QueryBuilderTelemetryHelper.logEvent_ExecutionPlanGenerationSucceeded(
          this.editorStore.applicationStore.telemetryService,
          report,
        );
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.isGeneratingPlan = false;
    }
  }

  *handleRunQuery(): GeneratorFn<void> {
    if (this.isRunningQuery) {
      return;
    }
    const query = this.queryState.query;
    const parameters = (query.parameters ?? []) as object[];
    if (parameters.length) {
      this.parametersState.openModal(query);
    } else {
      this.runQuery();
    }
  }

  *runQuery(): GeneratorFn<void> {
    if (this.isRunningQuery) {
      return;
    }

    QueryBuilderTelemetryHelper.logEvent_QueryRunLaunched(
      this.editorStore.applicationStore.telemetryService,
    );

    let promise;
    try {
      this.isRunningQuery = true;
      const stopWatch = new StopWatch();
      const report = reportGraphAnalytics(
        this.editorStore.graphManagerState.graph,
      );
      promise = this.editorStore.graphManagerState.graphManager.runQuery(
        getExecutionQueryFromRawLambda(
          this.queryState.query,
          this.parametersState.parameterStates,
          this.editorStore.graphManagerState,
        ),
        this.selectedExecutionContextState?.executionContext.mapping.value,
        this.selectedExecutionContextState?.executionContext.runtime,
        this.editorStore.graphManagerState.graph,
        {
          useLosslessParse: true,
          parameterValues: buildExecutionParameterValues(
            this.parametersState.parameterStates,
            this.editorStore.graphManagerState,
          ),
        },
        report,
      );
      this.setQueryRunPromise(promise);
      const result = (yield promise) as ExecutionResultWithMetadata;
      if (this.queryRunPromise === promise) {
        this.setExecutionResultText(
          stringifyLosslessJSON(
            result.executionResult,
            undefined,
            DEFAULT_TAB_SIZE,
          ),
        );
        this.parametersState.setParameters([]);
        // report
        report.timings =
          this.editorStore.applicationStore.timeService.finalizeTimingsRecord(
            stopWatch,
            report.timings,
          );
        QueryBuilderTelemetryHelper.logEvent_QueryRunSucceeded(
          this.editorStore.applicationStore.telemetryService,
          report,
        );
      }
    } catch (error) {
      // When user cancels the query by calling the cancelQuery api, it will throw an execution failure error.
      // For now, we don't want to notify users about this failure. Therefore we check to ensure the promise is still the same one.
      // When cancelled the query, we set the queryRunPromise as undefined.
      if (this.queryRunPromise === promise) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
          error,
        );
        this.editorStore.applicationStore.notificationService.notifyError(
          error,
        );
      }
    } finally {
      this.isRunningQuery = false;
    }
  }

  *cancelQuery(): GeneratorFn<void> {
    this.setIsRunningQuery(false);
    this.setQueryRunPromise(undefined);
    try {
      yield this.editorStore.graphManagerState.graphManager.cancelUserExecutions(
        true,
      );
    } catch (error) {
      // Don't notify users about success or failure
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
    }
  }

  get serviceExecutionParameters():
    | { query: RawLambda; mapping: Mapping; runtime: Runtime }
    | undefined {
    if (!this.selectedExecutionContextState || this.isRunningQuery) {
      return undefined;
    }
    const query = this.queryState.query;
    return {
      query,
      mapping:
        this.selectedExecutionContextState.executionContext.mapping.value,
      runtime: this.selectedExecutionContextState.executionContext.runtime,
    };
  }

  closeRuntimeEditor(): void {
    this.runtimeEditorState = undefined;
  }

  openRuntimeEditor(): void {
    if (
      this.selectedExecutionContextState &&
      !(
        this.selectedExecutionContextState.executionContext.runtime instanceof
        RuntimePointer
      )
    ) {
      this.runtimeEditorState = new RuntimeEditorState(
        this.editorStore,
        this.selectedExecutionContextState.executionContext.runtime,
        true,
      );
    }
  }

  useCustomRuntime(): void {
    const customRuntime = new EngineRuntime();
    guaranteeNonNullable(this.selectedExecutionContextState);
    const executionState = this
      .selectedExecutionContextState as ServiceExecutionContextState;
    runtime_addMapping(
      customRuntime,
      PackageableElementExplicitReference.create(
        executionState.executionContext.mapping.value,
      ),
    );
    decorateRuntimeWithNewMapping(
      customRuntime,
      executionState.executionContext.mapping.value,
      this.editorStore,
    );
    executionState.setRuntime(customRuntime);
  }

  autoSelectRuntimeOnMappingChange(mapping: Mapping): void {
    if (this.selectedExecutionContextState) {
      const runtimes =
        this.editorStore.graphManagerState.graph.ownRuntimes.filter((runtime) =>
          runtime.runtimeValue.mappings.map((m) => m.value).includes(mapping),
        );
      if (runtimes.length) {
        this.selectedExecutionContextState.setRuntime(
          (runtimes[0] as PackageableRuntime).runtimeValue,
        );
      } else {
        this.useCustomRuntime();
      }
    }
  }

  abstract getInitiallySelectedExecutionContextState():
    | ServiceExecutionContextState
    | undefined;
  updateExecutionQuery(): void {
    pureExecution_setFunction(this.execution, this.queryState.query);
  }
}

export class InlineServicePureExecutionState extends ServicePureExecutionState {
  declare execution: PureSingleExecution;

  constructor(
    editorStore: EditorStore,
    serviceEditorState: ServiceEditorState,
    execution: PureSingleExecution,
  ) {
    super(editorStore, serviceEditorState, execution);

    makeObservable(this, {
      queryState: observable,
      isRunningQuery: observable,
      isGeneratingPlan: observable,
      isOpeningQueryEditor: observable,
      executionResultText: observable,
      executionPlanState: observable,
      showChangeExecModal: observable,
      setExecutionResultText: action,
      setQueryState: action,
      updateExecutionQuery: action,
      setOpeningQueryEditor: action,
      generatePlan: flow,
      handleRunQuery: flow,
      runQuery: flow,
    });
    this.selectedExecutionContextState =
      this.getInitiallySelectedExecutionContextState();
  }

  changeExecution(): void {
    throw new Error('Method not implemented.');
  }

  getInitiallySelectedExecutionContextState():
    | ServiceExecutionContextState
    | undefined {
    return undefined;
  }
}

export class SingleServicePureExecutionState extends ServicePureExecutionState {
  declare execution: PureSingleExecution;
  declare selectedExecutionContextState: ServiceExecutionContextState;
  multiExecutionKey = 'key';

  constructor(
    editorStore: EditorStore,
    serviceEditorState: ServiceEditorState,
    execution: PureSingleExecution,
  ) {
    super(editorStore, serviceEditorState, execution);

    makeObservable(this, {
      queryState: observable,
      getInitiallySelectedExecutionContextState: observable,
      selectedExecutionContextState: observable,
      runtimeEditorState: observable,
      isRunningQuery: observable,
      isGeneratingPlan: observable,
      isOpeningQueryEditor: observable,
      executionResultText: observable,
      executionPlanState: observable,
      showChangeExecModal: observable,
      multiExecutionKey: observable,
      setExecutionResultText: action,
      closeRuntimeEditor: action,
      openRuntimeEditor: action,
      useCustomRuntime: action,
      setQueryState: action,
      autoSelectRuntimeOnMappingChange: action,
      updateExecutionQuery: action,
      setOpeningQueryEditor: action,
      changeExecution: action,
      setMultiExecutionKey: action,
      setShowChangeExecModal: action,
      setIsRunningQuery: action,
      generatePlan: flow,
      handleRunQuery: flow,
      runQuery: flow,
    });
    this.selectedExecutionContextState =
      this.getInitiallySelectedExecutionContextState();
  }

  override isChangeExecutionDisabled(): boolean {
    return this.multiExecutionKey === '';
  }

  getInitiallySelectedExecutionContextState(): ServiceExecutionContextState {
    return new SingleExecutionContextState(this);
  }

  setMultiExecutionKey(val: string): void {
    this.multiExecutionKey = val;
  }

  changeExecution(): void {
    if (this.execution.mapping && this.execution.runtime) {
      const _execution = new PureMultiExecution(
        this.multiExecutionKey,
        this.execution.func,
        this.serviceEditorState.service,
      );
      const _parameter = new KeyedExecutionParameter(
        `execContext_1`,
        this.execution.mapping,
        this.execution.runtime,
      );
      _execution.executionParameters = [_parameter];
      service_setExecution(
        this.serviceEditorState.service,
        _execution,
        this.editorStore.changeDetectionState.observerContext,
      );
      this.serviceEditorState.resetExecutionState();
    }
  }
}

export class MultiServicePureExecutionState extends ServicePureExecutionState {
  declare execution: PureMultiExecution;
  newKeyParameterModal = false;
  renameKey: KeyedExecutionParameter | undefined;
  singleExecutionKey: KeyedExecutionParameter | undefined;

  constructor(
    editorStore: EditorStore,
    serviceEditorState: ServiceEditorState,
    execution: PureMultiExecution,
  ) {
    super(editorStore, serviceEditorState, execution);

    makeObservable(this, {
      queryState: observable,
      selectedExecutionContextState: observable,
      runtimeEditorState: observable,
      isRunningQuery: observable,
      isGeneratingPlan: observable,
      isOpeningQueryEditor: observable,
      executionResultText: observable,
      executionPlanState: observable,
      newKeyParameterModal: observable,
      renameKey: observable,
      singleExecutionKey: observable,
      showChangeExecModal: observable,
      setExecutionResultText: action,
      closeRuntimeEditor: action,
      openRuntimeEditor: action,
      useCustomRuntime: action,
      setQueryState: action,
      autoSelectRuntimeOnMappingChange: action,
      updateExecutionQuery: action,
      setOpeningQueryEditor: action,
      deleteKeyExecutionParameter: action,
      setNewKeyParameterModal: action,
      changeKeyedExecutionParameter: action,
      setRenameKey: action,
      addExecutionParameter: action,
      setExecutionKey: action,
      changeKeyValue: action,
      setSingleExecutionKey: action,
      setShowChangeExecModal: action,
      setIsRunningQuery: action,
      changeExecution: action,
      generatePlan: flow,
      handleRunQuery: flow,
      runQuery: flow,
    });
    this.execution = execution;
    this.selectedExecutionContextState =
      this.getInitiallySelectedExecutionContextState();
    this.queryState = new ServicePureExecutionQueryState(
      this.editorStore,
      execution,
    );
    this.executionPlanState = new ExecutionPlanState(
      this.editorStore.applicationStore,
      this.editorStore.graphManagerState,
    );
  }

  get keyedExecutionParameters(): KeyedExecutionParameter[] {
    return this.execution.executionParameters ?? [];
  }

  setSingleExecutionKey(val: KeyedExecutionParameter | undefined): void {
    this.singleExecutionKey = val;
  }

  changeExecution(): void {
    const mappingExecution = this.singleExecutionKey;
    // stub
    const _mapping = mappingExecution?.mapping.value ?? stub_Mapping();
    const mapping = PackageableElementExplicitReference.create(_mapping);
    const runtime = mappingExecution?.runtime ?? stub_PackageableRuntime();
    const _execution = new PureSingleExecution(
      this.execution.func,
      this.serviceEditorState.service,
      mapping,
      runtime,
    );
    service_setExecution(
      this.serviceEditorState.service,
      _execution,
      this.editorStore.changeDetectionState.observerContext,
    );
    this.serviceEditorState.resetExecutionState();
  }

  setRenameKey(key: KeyedExecutionParameter | undefined): void {
    this.renameKey = key;
  }

  setNewKeyParameterModal(val: boolean): void {
    this.newKeyParameterModal = val;
  }

  setExecutionKey(val: string): void {
    pureMultiExecution_setExecutionKey(this.execution, val);
  }

  getInitiallySelectedExecutionContextState():
    | ServiceExecutionContextState
    | undefined {
    const parameter = this.keyedExecutionParameters[0];
    return parameter
      ? new KeyedExecutionContextState(parameter, this)
      : undefined;
  }

  changeKeyedExecutionParameter(value: KeyedExecutionParameter): void {
    this.selectedExecutionContextState = new KeyedExecutionContextState(
      value,
      this,
    );
  }

  deleteKeyExecutionParameter(value: KeyedExecutionParameter): void {
    pureMultiExecution_deleteExecutionParameter(
      this.keyedExecutionParameters,
      value,
    );
    if (value === this.selectedExecutionContextState?.executionContext) {
      this.selectedExecutionContextState =
        this.getInitiallySelectedExecutionContextState();
    }
  }

  addExecutionParameter(value: string): void {
    const _mapping =
      this.editorStore.graphManagerState.usableMappings[0] ?? stub_Mapping();
    const _key = new KeyedExecutionParameter(
      value,
      PackageableElementExplicitReference.create(_mapping),
      stub_PackageableRuntime(),
    );
    pureMultiExecution_addExecutionParameter(
      this.keyedExecutionParameters,
      _key,
      this.editorStore.changeDetectionState.observerContext,
    );
    this.selectedExecutionContextState = new KeyedExecutionContextState(
      _key,
      this,
    );
  }

  changeKeyValue(key: KeyedExecutionParameter, value: string): void {
    keyedExecutionParameter_setKey(key, value);
  }
}
