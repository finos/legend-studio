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
  losslessStringify,
  tryToFormatLosslessJSONString,
  UnsupportedOperationError,
  guaranteeType,
} from '@finos/legend-shared';
import { LegacySingleExecutionTestState } from './LegacyServiceTestState';
import type { EditorStore } from '../../../EditorStore';
import type { ServiceEditorState } from './ServiceEditorState';
import {
  decorateRuntimeWithNewMapping,
  RuntimeEditorState,
} from '../../../editor-state/element-editor-state/RuntimeEditorState';
import { LambdaEditorState, TAB_SIZE } from '@finos/legend-application';
import { ExecutionPlanState } from '../../../ExecutionPlanState';
import {
  type ServiceExecution,
  type KeyedExecutionParameter,
  type PureExecution,
  type Mapping,
  type Runtime,
  type ExecutionResult,
  type LightQuery,
  type PackageableRuntime,
  GRAPH_MANAGER_EVENT,
  RawLambda,
  PureSingleExecution,
  PureMultiExecution,
  EngineRuntime,
  RuntimePointer,
  PackageableElementExplicitReference,
  buildSourceInformationSourceId,
  PureClientVersion,
  QueryProjectCoordinates,
  QuerySearchSpecification,
  type RawExecutionPlan,
  DEPRECATED__SingleExecutionTest,
} from '@finos/legend-graph';
import type { Entity } from '@finos/legend-model-storage';
import { parseGACoordinates } from '@finos/legend-server-depot';
import { runtime_addMapping } from '../../../graphModifier/DSLMapping_GraphModifierHelper';
import {
  pureExecution_setFunction,
  pureSingleExecution_setRuntime,
  singleExecTest_setData,
} from '../../../graphModifier/DSLService_GraphModifierHelper';
import { ServiceTestSuiteState } from './ServiceTestSuiteState';

export enum SERVICE_EXECUTION_TAB {
  EXECUTION_CONTEXT = 'EXECUTION_CONTEXT',
  TESTS = 'TESTS',
}

export abstract class ServiceExecutionState {
  editorStore: EditorStore;
  serviceEditorState: ServiceEditorState;
  execution: ServiceExecution;
  selectedSingeExecutionTestState?:
    | LegacySingleExecutionTestState
    | ServiceTestSuiteState
    | undefined;
  selectedTab = SERVICE_EXECUTION_TAB.EXECUTION_CONTEXT;

  constructor(
    editorStore: EditorStore,
    serviceEditorState: ServiceEditorState,
    execution: ServiceExecution,
  ) {
    makeObservable(this, {
      execution: observable,
      selectedSingeExecutionTestState: observable,
      selectedTab: observable,
      setSelectedTab: action,
    });

    this.editorStore = editorStore;
    this.execution = execution;
    this.serviceEditorState = serviceEditorState;
    this.selectedSingeExecutionTestState =
      this.getInitiallySelectedTestState(execution);
    // TODO: format to other format when we support other connections in the future
    if (
      this.selectedSingeExecutionTestState instanceof
      LegacySingleExecutionTestState
    ) {
      singleExecTest_setData(
        this.selectedSingeExecutionTestState.test,
        /**
         * @workaround https://github.com/finos/legend-studio/issues/68
         */
        tryToFormatLosslessJSONString(
          this.selectedSingeExecutionTestState.test.data,
        ),
      ); // pre-format test data
    }
  }

  setSelectedTab(val: SERVICE_EXECUTION_TAB): void {
    this.selectedTab = val;
  }

  getInitiallySelectedTestState(
    execution: ServiceExecution,
  ): LegacySingleExecutionTestState | ServiceTestSuiteState | undefined {
    if (execution instanceof PureSingleExecution) {
      const _legacyTest = this.serviceEditorState.service.test;
      if (_legacyTest) {
        return new LegacySingleExecutionTestState(
          this.editorStore,
          this.serviceEditorState,
          guaranteeType(_legacyTest, DEPRECATED__SingleExecutionTest),
        );
      }
      return new ServiceTestSuiteState(
        this.editorStore,
        this.serviceEditorState,
      );
    } else if (execution instanceof PureMultiExecution) {
      return undefined;
    }
    throw new UnsupportedOperationError();
  }

  abstract get serviceExecutionParameters():
    | { query: RawLambda; mapping: Mapping; runtime: Runtime }
    | undefined;
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
              (yield this.editorStore.graphManagerState.graphManager.getQueryContent(
                query.id,
              )) as string,
            )) as RawLambda,
            '',
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
    const isValidSearchString = searchText.length >= 3;
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
      searchSpecification.limit = 10;
      searchSpecification.projectCoordinates = [
        // either get queries for the current project
        currentProjectCoordinates,
        // or any of its dependencies
        ...Array.from(
          (
            (yield flowResult(
              this.editorStore.graphState.getConfigurationProjectDependencyEntities(),
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

export class ServicePureExecutionState extends ServiceExecutionState {
  queryState: ServicePureExecutionQueryState;
  declare execution: PureExecution;
  selectedExecutionConfiguration?:
    | PureSingleExecution
    | KeyedExecutionParameter
    | undefined;
  runtimeEditorState?: RuntimeEditorState | undefined;
  isExecuting = false;
  isGeneratingPlan = false;
  isOpeningQueryEditor = false;
  executionResultText?: string | undefined; // NOTE: stored as lossless JSON string
  executionPlanState: ExecutionPlanState;

  constructor(
    editorStore: EditorStore,
    serviceEditorState: ServiceEditorState,
    execution: PureExecution,
  ) {
    super(editorStore, serviceEditorState, execution);

    makeObservable(this, {
      queryState: observable,
      selectedExecutionConfiguration: observable,
      runtimeEditorState: observable,
      isExecuting: observable,
      isGeneratingPlan: observable,
      isOpeningQueryEditor: observable,
      executionResultText: observable,
      executionPlanState: observable,
      setExecutionResultText: action,
      closeRuntimeEditor: action,
      openRuntimeEditor: action,
      useCustomRuntime: action,
      setQueryState: action,
      autoSelectRuntimeOnMappingChange: action,
      updateExecutionQuery: action,
      setOpeningQueryEditor: action,
      generatePlan: flow,
      execute: flow,
    });

    this.execution = execution;
    this.selectedExecutionConfiguration =
      this.getInitiallySelectedExecution(execution);
    this.queryState = new ServicePureExecutionQueryState(
      this.editorStore,
      execution,
    );
    this.executionPlanState = new ExecutionPlanState(this.editorStore);
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

  *generatePlan(debug: boolean): GeneratorFn<void> {
    if (!this.selectedExecutionConfiguration || this.isGeneratingPlan) {
      return;
    }
    try {
      const query = this.queryState.query;
      this.isGeneratingPlan = true;
      let rawPlan: RawExecutionPlan;
      if (debug) {
        const debugResult =
          (yield this.editorStore.graphManagerState.graphManager.debugExecutionPlanGeneration(
            this.editorStore.graphManagerState.graph,
            this.selectedExecutionConfiguration.mapping.value,
            query,
            this.selectedExecutionConfiguration.runtime,
            PureClientVersion.VX_X_X,
          )) as { plan: RawExecutionPlan; debug: string };
        rawPlan = debugResult.plan;
        this.executionPlanState.setDebugText(debugResult.debug);
      } else {
        rawPlan =
          (yield this.editorStore.graphManagerState.graphManager.generateExecutionPlan(
            this.editorStore.graphManagerState.graph,
            this.selectedExecutionConfiguration.mapping.value,
            query,
            this.selectedExecutionConfiguration.runtime,
            PureClientVersion.VX_X_X,
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

  *execute(): GeneratorFn<void> {
    if (!this.selectedExecutionConfiguration || this.isExecuting) {
      return;
    }
    try {
      this.isExecuting = true;
      const query = this.queryState.query;
      const result =
        (yield this.editorStore.graphManagerState.graphManager.executeMapping(
          this.editorStore.graphManagerState.graph,
          this.selectedExecutionConfiguration.mapping.value,
          query,
          this.selectedExecutionConfiguration.runtime,
          PureClientVersion.VX_X_X,
          {
            useLosslessParse: true,
          },
        )) as ExecutionResult;
      this.setExecutionResultText(
        losslessStringify(result, undefined, TAB_SIZE),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isExecuting = false;
    }
  }

  get serviceExecutionParameters():
    | { query: RawLambda; mapping: Mapping; runtime: Runtime }
    | undefined {
    if (!this.selectedExecutionConfiguration || this.isExecuting) {
      return undefined;
    }
    const query = this.queryState.query;
    return {
      query,
      mapping: this.selectedExecutionConfiguration.mapping.value,
      runtime: this.selectedExecutionConfiguration.runtime,
    };
  }

  closeRuntimeEditor(): void {
    this.runtimeEditorState = undefined;
  }
  openRuntimeEditor(): void {
    if (
      this.selectedExecutionConfiguration &&
      !(this.selectedExecutionConfiguration.runtime instanceof RuntimePointer)
    ) {
      this.runtimeEditorState = new RuntimeEditorState(
        this.editorStore,
        this.selectedExecutionConfiguration.runtime,
        true,
      );
    }
  }

  useCustomRuntime(): void {
    if (this.selectedExecutionConfiguration) {
      const customRuntime = new EngineRuntime();
      runtime_addMapping(
        customRuntime,
        PackageableElementExplicitReference.create(
          this.selectedExecutionConfiguration.mapping.value,
        ),
      );
      decorateRuntimeWithNewMapping(
        this.selectedExecutionConfiguration.runtime,
        this.selectedExecutionConfiguration.mapping.value,
        this.editorStore,
      );
      pureSingleExecution_setRuntime(
        this.selectedExecutionConfiguration,
        customRuntime,
        this.editorStore.changeDetectionState.observerContext,
      );
    }
  }

  autoSelectRuntimeOnMappingChange(mapping: Mapping): void {
    if (this.selectedExecutionConfiguration) {
      const runtimes =
        this.editorStore.graphManagerState.graph.ownRuntimes.filter((runtime) =>
          runtime.runtimeValue.mappings.map((m) => m.value).includes(mapping),
        );
      if (runtimes.length) {
        pureSingleExecution_setRuntime(
          this.selectedExecutionConfiguration,
          (runtimes[0] as PackageableRuntime).runtimeValue,
          this.editorStore.changeDetectionState.observerContext,
        );
      } else {
        this.useCustomRuntime();
      }
    }
  }

  getInitiallySelectedExecution(
    execution: PureExecution,
  ): PureSingleExecution | KeyedExecutionParameter | undefined {
    if (execution instanceof PureSingleExecution) {
      return execution;
    } else if (execution instanceof PureMultiExecution) {
      if (execution.executionParameters.length) {
        return execution.executionParameters[0];
      }
      return undefined;
    }
    throw new UnsupportedOperationError();
  }

  updateExecutionQuery(): void {
    pureExecution_setFunction(this.execution, this.queryState.query);
  }
}
