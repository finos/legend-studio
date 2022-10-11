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
  ActionState,
  assertErrorThrown,
  LogEvent,
  stringifyLosslessJSON,
  UnsupportedOperationError,
  filterByType,
} from '@finos/legend-shared';
import type { ServiceEditorState } from './ServiceEditorState.js';
import {
  decorateRuntimeWithNewMapping,
  RuntimeEditorState,
} from '../../../editor-state/element-editor-state/RuntimeEditorState.js';
import {
  DEFAULT_TYPEAHEAD_SEARCH_LIMIT,
  DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH,
  ExecutionPlanState,
  TAB_SIZE,
} from '@finos/legend-application';
import {
  type ServiceExecution,
  type PureExecution,
  type Mapping,
  type Runtime,
  type ExecutionResult,
  type LightQuery,
  type PackageableRuntime,
  type RawExecutionPlan,
  type PackageableElementReference,
  type QueryInfo,
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
  QuerySearchSpecification,
  buildLambdaVariableExpressions,
  observe_ValueSpecification,
  VariableExpression,
  buildRawLambdaFromLambdaFunction,
  stub_PackageableRuntime,
  stub_Mapping,
} from '@finos/legend-graph';
import { type Entity, parseGACoordinates } from '@finos/legend-storage';
import { runtime_addMapping } from '../../../shared/modifier/DSL_Mapping_GraphModifierHelper.js';
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
} from '../../../shared/modifier/DSL_Service_GraphModifierHelper.js';
import {
  buildParametersLetLambdaFunc,
  LambdaEditorState,
  LambdaParametersState,
  LambdaParameterState,
  PARAMETER_SUBMIT_ACTION,
} from '@finos/legend-query-builder';

export class ServiceExecutionParameterState extends LambdaParametersState {
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
      PARAMETER_SUBMIT_ACTION.EXECUTE,
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
  editorStore: EditorStore;
  serviceEditorState: ServiceEditorState;
  execution: ServiceExecution;
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

interface QueryImportInfo {
  query: LightQuery;
  content: string;
}

export class ServicePureExecutionQueryState extends LambdaEditorState {
  editorStore: EditorStore;
  execution: PureExecution;
  isInitializingLambda = false;

  openQueryImporter = false;
  queries: LightQuery[] = [];
  selectedQueryInfo?: QueryImportInfo | undefined;
  loadQueriesState = ActionState.create();
  loadQueryInfoState = ActionState.create();
  importQueryState = ActionState.create();

  constructor(editorStore: EditorStore, execution: PureExecution) {
    super('', '');

    makeObservable(this, {
      execution: observable,
      isInitializingLambda: observable,
      openQueryImporter: observable,
      queries: observable,
      selectedQueryInfo: observable,
      setOpenQueryImporter: action,
      setIsInitializingLambda: action,
      setLambda: action,
      updateLamba: flow,
      loadQueries: flow,
      setSelectedQueryInfo: flow,
      importQuery: flow,
    });

    this.editorStore = editorStore;
    this.execution = execution;
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

  setOpenQueryImporter(val: boolean): void {
    this.openQueryImporter = val;
  }

  *setSelectedQueryInfo(query: LightQuery | undefined): GeneratorFn<void> {
    if (query) {
      try {
        this.loadQueryInfoState.inProgress();
        const content =
          (yield this.editorStore.graphManagerState.graphManager.lambdaToPureCode(
            (yield this.editorStore.graphManagerState.graphManager.pureCodeToLambda(
              (
                (yield this.editorStore.graphManagerState.graphManager.getQueryInfo(
                  query.id,
                )) as QueryInfo
              ).content,
            )) as RawLambda,
            true,
          )) as string;
        this.selectedQueryInfo = {
          query,
          content,
        };
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.notifyError(error);
      } finally {
        this.loadQueryInfoState.reset();
      }
    } else {
      this.selectedQueryInfo = undefined;
    }
  }

  *importQuery(): GeneratorFn<void> {
    if (this.selectedQueryInfo) {
      try {
        this.importQueryState.inProgress();
        const lambda =
          (yield this.editorStore.graphManagerState.graphManager.pureCodeToLambda(
            this.selectedQueryInfo.content,
          )) as RawLambda;
        yield flowResult(this.updateLamba(lambda));
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.notifyError(error);
      } finally {
        this.setOpenQueryImporter(false);
        this.importQueryState.reset();
      }
    }
  }

  *loadQueries(searchText: string): GeneratorFn<void> {
    const isValidSearchString =
      searchText.length >= DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH;
    this.loadQueriesState.inProgress();
    try {
      const searchSpecification = new QuerySearchSpecification();
      const currentProjectCoordinates = new QueryProjectCoordinates();
      currentProjectCoordinates.groupId =
        this.editorStore.projectConfigurationEditorState.currentProjectConfiguration.groupId;
      currentProjectCoordinates.artifactId =
        this.editorStore.projectConfigurationEditorState.currentProjectConfiguration.artifactId;
      searchSpecification.searchTerm = isValidSearchString
        ? searchText
        : undefined;
      searchSpecification.limit = DEFAULT_TYPEAHEAD_SEARCH_LIMIT;
      searchSpecification.projectCoordinates = [
        // either get queries for the current project
        currentProjectCoordinates,
        // or any of its dependencies
        ...Array.from(
          (
            (yield flowResult(
              this.editorStore.graphState.getIndexedDependencyEntities(),
            )) as Map<string, Entity[]>
          ).keys(),
        ).map((coordinatesInText) => {
          const { groupId, artifactId } = parseGACoordinates(coordinatesInText);
          const coordinates = new QueryProjectCoordinates();
          coordinates.groupId = groupId;
          coordinates.artifactId = artifactId;
          return coordinates;
        }),
      ];
      this.queries =
        (yield this.editorStore.graphManagerState.graphManager.searchQueries(
          searchSpecification,
        )) as LightQuery[];
      this.loadQueriesState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.loadQueriesState.fail();
      this.editorStore.applicationStore.notifyError(error);
    }
  }

  *updateLamba(val: RawLambda): GeneratorFn<void> {
    this.setLambda(val);
    yield flowResult(this.convertLambdaObjectToGrammarString(true));
  }

  *convertLambdaObjectToGrammarString(pretty?: boolean): GeneratorFn<void> {
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
            pretty,
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
        this.editorStore.applicationStore.log.error(
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
  executionContext: ServiceExecutionContext;
  executionState: ServiceExecutionState;

  constructor(
    executionContext: ServiceExecutionContext,
    executionState: ServiceExecutionState,
  ) {
    this.executionContext = executionContext;
    this.executionState = executionState;
  }

  abstract setMapping(value: Mapping): void;
  abstract setRuntime(value: Runtime): void;
}

export class SingleExecutionContextState extends ServiceExecutionContextState {
  declare executionContext: PureSingleExecution;

  constructor(
    executionContext: PureSingleExecution,
    executionState: ServiceExecutionState,
  ) {
    super(executionContext, executionState);
    makeObservable(this, {
      executionContext: observable,
      setMapping: action,
      setRuntime: action,
    });
  }

  setMapping(value: Mapping): void {
    pureSingleExecution_setMapping(
      this.executionContext,
      value,
      this.executionState.editorStore.changeDetectionState.observerContext,
    );
  }
  setRuntime(value: Runtime): void {
    pureSingleExecution_setRuntime(
      this.executionContext,
      value,
      this.executionState.editorStore.changeDetectionState.observerContext,
    );
  }
}

export class KeyedExecutionContextState extends ServiceExecutionContextState {
  declare executionContext: KeyedExecutionParameter;

  setMapping(value: Mapping): void {
    pureSingleExecution_setMapping(
      this.executionContext,
      value,
      this.executionState.editorStore.changeDetectionState.observerContext,
    );
  }

  setRuntime(value: Runtime): void {
    pureSingleExecution_setRuntime(
      this.executionContext,
      value,
      this.executionState.editorStore.changeDetectionState.observerContext,
    );
  }
}

export abstract class ServicePureExecutionState extends ServiceExecutionState {
  queryState: ServicePureExecutionQueryState;
  declare execution: PureExecution;
  selectedExecutionContextState: ServiceExecutionContextState | undefined;
  runtimeEditorState?: RuntimeEditorState | undefined;
  isRunningQuery = false;
  isGeneratingPlan = false;
  isOpeningQueryEditor = false;
  executionResultText?: string | undefined; // NOTE: stored as lossless JSON string
  executionPlanState: ExecutionPlanState;
  parameterState: ServiceExecutionParameterState;
  showChangeExecModal = false;
  queryRunPromise: Promise<ExecutionResult> | undefined = undefined;

  constructor(
    editorStore: EditorStore,
    serviceEditorState: ServiceEditorState,
    execution: PureExecution,
  ) {
    super(editorStore, serviceEditorState, execution);

    this.execution = execution;
    this.queryState = new ServicePureExecutionQueryState(
      this.editorStore,
      execution,
    );
    this.executionPlanState = new ExecutionPlanState(
      this.editorStore.applicationStore,
      this.editorStore.graphManagerState,
    );
    this.parameterState = new ServiceExecutionParameterState(this);
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
    promise: Promise<ExecutionResult> | undefined,
  ): void => {
    this.queryRunPromise = promise;
  };

  *generatePlan(debug: boolean): GeneratorFn<void> {
    if (!this.selectedExecutionContextState || this.isGeneratingPlan) {
      return;
    }
    try {
      const query = this.queryState.query;
      this.isGeneratingPlan = true;
      let rawPlan: RawExecutionPlan;
      if (debug) {
        const debugResult =
          (yield this.editorStore.graphManagerState.graphManager.debugExecutionPlanGeneration(
            query,
            this.selectedExecutionContextState.executionContext.mapping.value,
            this.selectedExecutionContextState.executionContext.runtime,
            this.editorStore.graphManagerState.graph,
          )) as { plan: RawExecutionPlan; debug: string };
        rawPlan = debugResult.plan;
        this.executionPlanState.setDebugText(debugResult.debug);
      } else {
        rawPlan =
          (yield this.editorStore.graphManagerState.graphManager.generateExecutionPlan(
            query,
            this.selectedExecutionContextState.executionContext.mapping.value,
            this.selectedExecutionContextState.executionContext.runtime,
            this.editorStore.graphManagerState.graph,
          )) as object;
      }
      try {
        this.executionPlanState.setRawPlan(rawPlan);
        const plan =
          this.editorStore.graphManagerState.graphManager.buildExecutionPlan(
            rawPlan,
            this.editorStore.graphManagerState.graph,
          );
        this.executionPlanState.setPlan(plan);
      } catch {
        // do nothing
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isGeneratingPlan = false;
    }
  }

  *handleExecute(): GeneratorFn<void> {
    if (!this.selectedExecutionContextState || this.isRunningQuery) {
      return;
    }
    const query = this.queryState.query;
    const parameters = (query.parameters ?? []) as object[];
    if (parameters.length) {
      this.parameterState.openModal(query);
    } else {
      this.runQuery();
    }
  }

  *runQuery(): GeneratorFn<void> {
    if (!this.selectedExecutionContextState || this.isRunningQuery) {
      return;
    }
    try {
      this.isRunningQuery = true;
      const query = this.getExecutionQuery();
      const promise =
        this.editorStore.graphManagerState.graphManager.executeMapping(
          query,
          this.selectedExecutionContextState.executionContext.mapping.value,
          this.selectedExecutionContextState.executionContext.runtime,
          this.editorStore.graphManagerState.graph,
          {
            useLosslessParse: true,
          },
        );
      this.setQueryRunPromise(promise);
      const result = (yield promise) as ExecutionResult;
      if (this.queryRunPromise === promise) {
        this.setExecutionResultText(
          stringifyLosslessJSON(result, undefined, TAB_SIZE),
        );
        this.parameterState.setParameters([]);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isRunningQuery = false;
    }
  }

  getExecutionQuery(): RawLambda {
    if (this.parameterState.parameterStates.length) {
      const letlambdaFunction = buildParametersLetLambdaFunc(
        this.editorStore.graphManagerState.graph,
        this.parameterState.parameterStates,
      );
      const letRawLambda = buildRawLambdaFromLambdaFunction(
        letlambdaFunction,
        this.editorStore.graphManagerState,
      );
      // reset parameters
      if (
        Array.isArray(this.queryState.query.body) &&
        Array.isArray(letRawLambda.body)
      ) {
        letRawLambda.body = [
          ...(letRawLambda.body as object[]),
          ...(this.queryState.query.body as object[]),
        ];
        return letRawLambda;
      }
    }
    return this.queryState.query;
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
    if (this.selectedExecutionContextState) {
      const customRuntime = new EngineRuntime();
      runtime_addMapping(
        customRuntime,
        PackageableElementExplicitReference.create(
          this.selectedExecutionContextState.executionContext.mapping.value,
        ),
      );
      decorateRuntimeWithNewMapping(
        this.selectedExecutionContextState.executionContext.runtime,
        this.selectedExecutionContextState.executionContext.mapping.value,
        this.editorStore,
      );
      this.selectedExecutionContextState.setRuntime(customRuntime);
    }
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
      runtimeEditorState: observable,
      isRunningQuery: observable,
      isGeneratingPlan: observable,
      isOpeningQueryEditor: observable,
      executionResultText: observable,
      executionPlanState: observable,
      showChangeExecModal: observable,
      parameterState: observable,
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
      handleExecute: flow,
      runQuery: flow,
    });
    this.selectedExecutionContextState =
      this.getInitiallySelectedExecutionContextState();
  }

  override isChangeExecutionDisabled(): boolean {
    return this.multiExecutionKey === '';
  }

  getInitiallySelectedExecutionContextState(): ServiceExecutionContextState {
    return new SingleExecutionContextState(this.execution, this);
  }

  setMultiExecutionKey(val: string): void {
    this.multiExecutionKey = val;
  }

  changeExecution(): void {
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
    const parameter = this.execution.executionParameters[0];
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
    pureMultiExecution_deleteExecutionParameter(this.execution, value);
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
      this.execution,
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
