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

import { action, flow, observable, makeObservable } from 'mobx';
import {
  type GeneratorFn,
  LogEvent,
  assertErrorThrown,
  guaranteeNonNullable,
  guaranteeType,
  filterByType,
} from '@finos/legend-shared';
import { QueryBuilderFilterState } from './filter/QueryBuilderFilterState.js';
import { QueryBuilderFetchStructureState } from './fetch-structure/QueryBuilderFetchStructureState.js';
import {
  QueryTextEditorMode,
  QueryTextEditorState,
} from './QueryTextEditorState.js';
import { QueryBuilderSetupState } from './QueryBuilderSetupState.js';
import { QueryBuilderExplorerState } from './explorer/QueryBuilderExplorerState.js';
import { QueryBuilderResultState } from './QueryBuilderResultState.js';
import {
  processQueryLambdaFunction,
  processParameters,
} from './QueryBuilderStateBuilder.js';
import { QueryBuilderUnsupportedState } from './QueryBuilderUnsupportedState.js';
import {
  type Class,
  type GraphManagerState,
  type ValueSpecification,
  GenericTypeExplicitReference,
  GenericType,
  PRIMITIVE_TYPE,
  GRAPH_MANAGER_EVENT,
  CompilationError,
  extractSourceInformationCoordinates,
  LambdaFunctionInstanceValue,
  RawLambda,
  TYPICAL_MULTIPLICITY_TYPE,
  VariableExpression,
  observe_ValueSpecification,
  ObserverContext,
  isStubbed_RawLambda,
  buildLambdaVariableExpressions,
  buildRawLambdaFromLambdaFunction,
} from '@finos/legend-graph';
import { buildLambdaFunction } from './QueryBuilderValueSpecificationBuilder.js';
import {
  LambdaParameterState,
  type GenericLegendApplicationStore,
} from '@finos/legend-application';
import { QueryFunctionsExplorerState } from './explorer/QueryFunctionsExplorerState.js';
import { QueryParametersState } from './QueryParametersState.js';
import type { QueryBuilderFilterOperator } from './filter/QueryBuilderFilterOperator.js';
import { getQueryBuilderCoreFilterOperators } from './filter/QueryBuilderFilterOperatorLoader.js';
import { QueryBuilderChangeDetectionState } from './QueryBuilderChangeDetectionState.js';
import { QueryBuilderMilestoningState } from './QueryBuilderMilestoningState.js';

export abstract class QueryBuilderState {
  applicationStore: GenericLegendApplicationStore;
  graphManagerState: GraphManagerState;

  setupState: QueryBuilderSetupState;
  milestoningState: QueryBuilderMilestoningState;
  explorerState: QueryBuilderExplorerState;
  parametersState: QueryParametersState;
  functionsExplorerState: QueryFunctionsExplorerState;
  fetchStructureState: QueryBuilderFetchStructureState;
  filterState: QueryBuilderFilterState;
  resultState: QueryBuilderResultState;
  textEditorState: QueryTextEditorState;
  queryUnsupportedState: QueryBuilderUnsupportedState;
  observableContext: ObserverContext;
  changeDetectionState: QueryBuilderChangeDetectionState;
  isCompiling = false;
  backdrop = false;
  showFunctionPanel = false;
  showParameterPanel = false;

  filterOperators: QueryBuilderFilterOperator[] =
    getQueryBuilderCoreFilterOperators();

  constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
  ) {
    makeObservable(this, {
      setupState: observable,
      explorerState: observable,
      parametersState: observable,
      functionsExplorerState: observable,
      fetchStructureState: observable,
      filterState: observable,
      resultState: observable,
      textEditorState: observable,
      queryUnsupportedState: observable,
      isCompiling: observable,
      backdrop: observable,
      showFunctionPanel: observable,
      showParameterPanel: observable,
      changeDetectionState: observable,
      resetQueryBuilder: action,
      resetQueryContent: action,
      buildStateFromRawLambda: action,
      saveQuery: action,
      setBackdrop: action,
      setShowFunctionPanel: action,
      setShowParameterPanel: action,
      changeClass: action,
      compileQuery: flow,
    });

    this.applicationStore = applicationStore;
    this.graphManagerState = graphManagerState;

    this.setupState = new QueryBuilderSetupState(this);
    this.milestoningState = new QueryBuilderMilestoningState(this);
    this.explorerState = new QueryBuilderExplorerState(this);
    this.parametersState = new QueryParametersState(this);
    this.functionsExplorerState = new QueryFunctionsExplorerState(this);
    this.fetchStructureState = new QueryBuilderFetchStructureState(this);
    this.filterState = new QueryBuilderFilterState(this, this.filterOperators);
    this.resultState = new QueryBuilderResultState(this);
    this.textEditorState = new QueryTextEditorState(this);
    this.queryUnsupportedState = new QueryBuilderUnsupportedState(this);
    this.observableContext = new ObserverContext(
      this.graphManagerState.pluginManager.getPureGraphManagerPlugins(),
    );
    this.changeDetectionState = new QueryBuilderChangeDetectionState(this);
  }

  abstract get isParametersDisabled(): boolean;
  abstract get isResultPanelHidden(): boolean;
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

  setShowFunctionPanel(val: boolean): void {
    this.showFunctionPanel = val;
  }

  setShowParameterPanel(val: boolean): void {
    this.showParameterPanel = val;
  }

  getQuery(options?: { keepSourceInformation: boolean }): RawLambda {
    if (!this.isQuerySupported()) {
      const parameters = this.parametersState.parameterStates.map((e) =>
        this.graphManagerState.graphManager.serializeValueSpecification(
          e.parameter,
        ),
      );
      this.queryUnsupportedState.setRawLambda(
        new RawLambda(parameters, this.queryUnsupportedState.rawLambda?.body),
      );
      return guaranteeNonNullable(this.queryUnsupportedState.rawLambda);
    }
    return buildRawLambdaFromLambdaFunction(
      buildLambdaFunction(this, {
        keepSourceInformation: Boolean(options?.keepSourceInformation),
      }),
      this.graphManagerState,
    );
  }

  resetQueryBuilder(): void {
    const resultState = new QueryBuilderResultState(this);
    resultState.setPreviewLimit(this.resultState.previewLimit);
    this.resultState = resultState;
    this.textEditorState = new QueryTextEditorState(this);
    this.queryUnsupportedState = new QueryBuilderUnsupportedState(this);
    this.setShowParameterPanel(false);
  }

  resetQueryContent(): void {
    this.milestoningState = new QueryBuilderMilestoningState(this);
    this.explorerState = new QueryBuilderExplorerState(this);
    this.explorerState.refreshTreeData();
    this.parametersState = new QueryParametersState(this);
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

  initialize(rawLambda: RawLambda, options?: { notifyError: boolean }): void {
    try {
      this.buildStateFromRawLambda(rawLambda);
      if (this.parametersState.parameterStates.length > 0) {
        this.setShowParameterPanel(true);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.changeClass(undefined, true);
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
      this.queryUnsupportedState.setLambdaError(error);
      this.queryUnsupportedState.setRawLambda(rawLambda);
    }
  }

  /**
   * Process the raw lambda, and build the query builder state.
   *
   * @throws error if there is an issue building the compiled lambda or rebuilding the state.
   * consumers of function should handle the errors.
   */
  buildStateFromRawLambda(rawLambda: RawLambda): void {
    this.resetQueryBuilder();
    this.resetQueryContent();
    if (!isStubbed_RawLambda(rawLambda)) {
      const valueSpec = observe_ValueSpecification(
        this.graphManagerState.graphManager.buildValueSpecification(
          this.graphManagerState.graphManager.serializeRawValueSpecification(
            rawLambda,
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

  buildMilestoningParameter(parameterName: string): ValueSpecification {
    const milestoningParameter = new VariableExpression(
      parameterName,
      this.graphManagerState.graph.getTypicalMultiplicity(
        TYPICAL_MULTIPLICITY_TYPE.ONE,
      ),
      GenericTypeExplicitReference.create(
        new GenericType(
          this.parametersState.queryBuilderState.graphManagerState.graph.getPrimitiveType(
            PRIMITIVE_TYPE.DATE,
          ),
        ),
      ),
    );
    if (
      !this.parametersState.parameterStates.find(
        (p) => p.variableName === parameterName,
      )
    ) {
      const variableState = new LambdaParameterState(
        milestoningParameter,
        this.setupState.queryBuilderState.observableContext,
        this.setupState.queryBuilderState.graphManagerState.graph,
      );
      variableState.mockParameterValue();
      this.parametersState.addParameter(variableState);
    }
    return milestoningParameter;
  }

  async saveQuery(
    onSaveQuery: (lambda: RawLambda) => Promise<void>,
  ): Promise<void> {
    try {
      const rawLambda = this.getQuery();
      await onSaveQuery(rawLambda);
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notifyError(`Can't save query: ${error.message}`);
    }
  }

  isQuerySupported(): boolean {
    return !this.queryUnsupportedState.rawLambda;
  }

  clearCompilationError(): void {
    this.fetchStructureState.implementation.clearCompilationError();
  }

  *compileQuery(): GeneratorFn<void> {
    if (!this.textEditorState.mode) {
      this.isCompiling = true;
      this.clearCompilationError();
      // form mode
      try {
        this.textEditorState.setCompilationError(undefined);
        // NOTE: retain the source information on the lambda in order to be able
        // to pin-point compilation issue in form mode
        (yield this.graphManagerState.graphManager.getLambdaReturnType(
          this.getQuery({ keepSourceInformation: true }),
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
          this.textEditorState.openModal(QueryTextEditorMode.TEXT);
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
        this.isCompiling = false;
      }
    } else if (this.textEditorState.mode === QueryTextEditorMode.TEXT) {
      this.isCompiling = true;
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
        this.isCompiling = false;
      }
    }
  }

  changeClass(val: Class | undefined, isRebuildingState?: boolean): void {
    this.resetQueryBuilder();
    this.resetQueryContent();
    this.setupState.setClass(val, isRebuildingState);
    this.explorerState.refreshTreeData();
    this.milestoningState.updateMilestoningConfiguration();
    this.fetchStructureState.implementation.onClassChange(val);
  }

  get validationIssues(): string[] | undefined {
    return this.fetchStructureState.implementation.validationIssues;
  }
}

// TODO-BEFORE-PR: consider if we should put this in a different file and documentation of this class
export class BasicQueryBuilderState extends QueryBuilderState {
  private constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
  ) {
    super(applicationStore, graphManagerState);
  }

  static create(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
  ): BasicQueryBuilderState {
    return new BasicQueryBuilderState(applicationStore, graphManagerState);
  }

  get isParametersDisabled(): boolean {
    return false;
  }

  get isResultPanelHidden(): boolean {
    return false;
  }
}
