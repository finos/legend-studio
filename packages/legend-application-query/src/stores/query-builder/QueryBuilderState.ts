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

import { action, flow, observable, makeObservable, computed } from 'mobx';
import {
  type GeneratorFn,
  LogEvent,
  assertErrorThrown,
  guaranteeNonNullable,
  guaranteeType,
  filterByType,
  ActionState,
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
} from '@finos/legend-graph';
import { buildLambdaFunction } from './QueryBuilderValueSpecificationBuilder.js';
import type { GenericLegendApplicationStore } from '@finos/legend-application';
import { QueryFunctionsExplorerState } from './explorer/QueryFunctionsExplorerState.js';
import { QueryBuilderParametersState } from './QueryBuilderParametersState.js';
import type { QueryBuilderFilterOperator } from './filter/QueryBuilderFilterOperator.js';
import { getQueryBuilderCoreFilterOperators } from './filter/QueryBuilderFilterOperatorLoader.js';
import { QueryBuilderChangeDetectionState } from './QueryBuilderChangeDetectionState.js';
import { QueryBuilderMilestoningState } from './QueryBuilderMilestoningState.js';

export abstract class QueryBuilderState {
  applicationStore: GenericLegendApplicationStore;
  graphManagerState: GraphManagerState;

  changeDetectionState: QueryBuilderChangeDetectionState;
  explorerState: QueryBuilderExplorerState;
  functionsExplorerState: QueryFunctionsExplorerState;
  parametersState: QueryBuilderParametersState;
  milestoningState: QueryBuilderMilestoningState;
  fetchStructureState: QueryBuilderFetchStructureState;
  filterState: QueryBuilderFilterState;
  filterOperators: QueryBuilderFilterOperator[] =
    getQueryBuilderCoreFilterOperators();
  resultState: QueryBuilderResultState;
  textEditorState: QueryBuilderTextEditorState;
  unsupportedQueryState: QueryBuilderUnsupportedQueryState;
  observableContext: ObserverContext;

  queryCompileState = ActionState.create();
  backdrop = false;
  showFunctionsExplorerPanel = false;
  showParameterPanel = false;

  class?: Class | undefined;
  mapping?: Mapping | undefined;
  runtimeValue?: Runtime | undefined;

  constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
  ) {
    makeObservable(this, {
      explorerState: observable,
      parametersState: observable,
      functionsExplorerState: observable,
      fetchStructureState: observable,
      filterState: observable,
      resultState: observable,
      textEditorState: observable,
      unsupportedQueryState: observable,
      backdrop: observable,
      showFunctionsExplorerPanel: observable,
      showParameterPanel: observable,
      changeDetectionState: observable,
      isQuerySupported: computed,
      validationIssues: computed,

      setBackdrop: action,
      setShowFunctionsExplorerPanel: action,
      setShowParametersPanel: action,
      setClass: action,
      setMapping: action,
      setRuntimeValue: action,

      resetQueryBuilder: action,
      resetQueryContent: action,
      changeClass: action,

      rebuildWithQuery: action,
      compileQuery: flow,
      saveQuery: action,
    });

    this.applicationStore = applicationStore;
    this.graphManagerState = graphManagerState;

    this.milestoningState = new QueryBuilderMilestoningState(this);
    this.explorerState = new QueryBuilderExplorerState(this);
    this.parametersState = new QueryBuilderParametersState(this);
    this.functionsExplorerState = new QueryFunctionsExplorerState(this);
    this.fetchStructureState = new QueryBuilderFetchStructureState(this);
    this.filterState = new QueryBuilderFilterState(this, this.filterOperators);
    this.resultState = new QueryBuilderResultState(this);
    this.textEditorState = new QueryBuilderTextEditorState(this);
    this.unsupportedQueryState = new QueryBuilderUnsupportedQueryState(this);
    this.observableContext = new ObserverContext(
      this.graphManagerState.pluginManager.getPureGraphManagerPlugins(),
    );
    this.changeDetectionState = new QueryBuilderChangeDetectionState(this);
  }

  abstract get isParametersDisabled(): boolean;
  abstract get isResultPanelHidden(): boolean;
  abstract get isClassReadOnly(): boolean;
  abstract get isMappingReadOnly(): boolean;
  abstract get isRuntimeReadOnly(): boolean;
  /**
   * This flag is for turning on/off dnd from projection panel to filter panel,
   * and will be leveraged when the concepts of workflows are introduced into query builder.
   */
  get isDnDFetchStructureToFilterSupported(): boolean {
    return true;
  }

  setBackdrop(val: boolean): void {
    this.backdrop = val;
  }

  setShowFunctionsExplorerPanel(val: boolean): void {
    this.showFunctionsExplorerPanel = val;
  }

  setShowParametersPanel(val: boolean): void {
    this.showParameterPanel = val;
  }

  setClass(val: Class | undefined): void {
    this.class = val;
  }

  setMapping(val: Mapping | undefined): void {
    this.mapping = val;
  }

  setRuntimeValue(val: Runtime | undefined): void {
    this.runtimeValue = val;
  }

  get isQuerySupported(): boolean {
    return !this.unsupportedQueryState.rawLambda;
  }

  resetQueryBuilder(): void {
    const resultState = new QueryBuilderResultState(this);
    resultState.setPreviewLimit(this.resultState.previewLimit);
    this.resultState = resultState;
    this.textEditorState = new QueryBuilderTextEditorState(this);
    this.unsupportedQueryState = new QueryBuilderUnsupportedQueryState(this);
    this.setShowParametersPanel(false);
  }

  resetQueryContent(): void {
    this.milestoningState = new QueryBuilderMilestoningState(this);
    this.explorerState = new QueryBuilderExplorerState(this);
    this.explorerState.refreshTreeData();
    this.parametersState = new QueryBuilderParametersState(this);
    this.functionsExplorerState = new QueryFunctionsExplorerState(this);
    this.filterState = new QueryBuilderFilterState(this, this.filterOperators);
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
    this.resetQueryBuilder();
    this.resetQueryContent();
    this.setClass(val);
    this.explorerState.refreshTreeData();
    this.milestoningState.updateMilestoningConfiguration();
    this.fetchStructureState.implementation.onClassChange(val);
  }

  initialize(rawLambda: RawLambda, options?: { notifyError: boolean }): void {
    try {
      this.rebuildWithQuery(rawLambda);
      if (this.parametersState.parameterStates.length > 0) {
        this.setShowParametersPanel(true);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.setClass(undefined);
      const parameters = buildLambdaVariableExpressions(
        rawLambda,
        this.graphManagerState,
      )
        .map((param) =>
          observe_ValueSpecification(param, this.observableContext),
        )
        .filter(filterByType(VariableExpression));
      processParameters(parameters, this);
      if (options?.notifyError) {
        this.applicationStore.notifyError(
          `Can't initialize query builder: ${error.message}`,
        );
      }
      this.unsupportedQueryState.setLambdaError(error);
      this.unsupportedQueryState.setRawLambda(rawLambda);
    }
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
      }),
      this.graphManagerState,
    );
  }

  /**
   * Process the provided query, and rebuild the query builder state.
   *
   * @throws error if there is an issue building the compiled lambda or rebuilding the state.
   * consumers of function should handle the errors.
   */
  rebuildWithQuery(val: RawLambda): void {
    this.resetQueryBuilder();
    this.resetQueryContent();
    if (!isStubbed_RawLambda(val)) {
      const valueSpec = observe_ValueSpecification(
        this.graphManagerState.graphManager.buildValueSpecification(
          this.graphManagerState.graphManager.serializeRawValueSpecification(
            val,
          ),
          this.graphManagerState.graph,
        ),
        this.observableContext,
      );
      const compiledValueSpecification = guaranteeType(
        valueSpec,
        LambdaFunctionInstanceValue,
        `Can't build query state: query builder only support lambda`,
      );
      processQueryLambdaFunction(
        guaranteeNonNullable(compiledValueSpecification.values[0]),
        this,
      );
    }
  }

  async saveQuery(
    onSaveQuery: (lambda: RawLambda) => Promise<void>,
  ): Promise<void> {
    try {
      const rawLambda = this.buildQuery();
      await onSaveQuery(rawLambda);
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notifyError(`Can't save query: ${error.message}`);
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
        this.applicationStore.notifySuccess('Compiled successfully');
      } catch (error) {
        assertErrorThrown(error);
        this.applicationStore.log.error(
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
          this.applicationStore.notifyWarning(
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
          this.applicationStore.notifyWarning(
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
        this.applicationStore.notifySuccess('Compiled successfully');
      } catch (error) {
        assertErrorThrown(error);
        if (error instanceof CompilationError) {
          this.applicationStore.log.error(
            LogEvent.create(GRAPH_MANAGER_EVENT.COMPILATION_FAILURE),
            error,
          );
          this.applicationStore.notifyWarning(
            `Compilation failed: ${error.message}`,
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

  get validationIssues(): string[] | undefined {
    return this.fetchStructureState.implementation.validationIssues;
  }
}
