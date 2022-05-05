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
import {
  type QueryBuilderFilterOperator,
  QueryBuilderFilterState,
} from './QueryBuilderFilterState';
import { QueryBuilderFetchStructureState } from './QueryBuilderFetchStructureState';
import { QueryResultSetModifierState } from './QueryResultSetModifierState';
import {
  QueryTextEditorMode,
  QueryTextEditorState,
} from './QueryTextEditorState';
import { QueryBuilderSetupState } from './QueryBuilderSetupState';
import { QueryBuilderExplorerState } from './QueryBuilderExplorerState';
import { QueryBuilderResultState } from './QueryBuilderResultState';
import {
  processQueryBuilderLambdaFunction,
  processQueryParameters,
} from './QueryBuilderLambdaProcessor';
import { QueryBuilderUnsupportedState } from './QueryBuilderUnsupportedState';
import {
  type Class,
  type Enumeration,
  type GraphManagerState,
  type LambdaFunction,
  type Mapping,
  type PackageableRuntime,
  type Service,
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
} from '@finos/legend-graph';
import {
  QueryBuilderFilterOperator_Equal,
  QueryBuilderFilterOperator_NotEqual,
} from './filterOperators/QueryBuilderFilterOperator_Equal';
import { QueryBuilderFilterOperator_GreaterThan } from './filterOperators/QueryBuilderFilterOperator_GreaterThan';
import {
  QueryBuilderFilterOperator_NotStartWith,
  QueryBuilderFilterOperator_StartWith,
} from './filterOperators/QueryBuilderFilterOperator_StartWith';
import { QueryBuilderFilterOperator_GreaterThanEqual } from './filterOperators/QueryBuilderFilterOperator_GreaterThanEqual';
import { QueryBuilderFilterOperator_LessThanEqual } from './filterOperators/QueryBuilderFilterOperator_LessThanEqual';
import { QueryBuilderFilterOperator_LessThan } from './filterOperators/QueryBuilderFilterOperator_LessThan';
import {
  QueryBuilderFilterOperator_EndWith,
  QueryBuilderFilterOperator_NotEndWith,
} from './filterOperators/QueryBuilderFilterOperator_EndWith';
import {
  QueryBuilderFilterOperator_Contain,
  QueryBuilderFilterOperator_NotContain,
} from './filterOperators/QueryBuilderFilterOperator_Contain';
import {
  QueryBuilderFilterOperator_IsEmpty,
  QueryBuilderFilterOperator_IsNotEmpty,
} from './filterOperators/QueryBuilderFilterOperator_IsEmpty';
import {
  QueryBuilderFilterOperator_In,
  QueryBuilderFilterOperator_NotIn,
} from './filterOperators/QueryBuilderFilterOperator_In';
import { buildLambdaFunction } from './QueryBuilderLambdaBuilder';
import {
  buildElementOption,
  type ApplicationStore,
  type LegendApplicationConfig,
  type PackageableElementOption,
} from '@finos/legend-application';
import {
  QueryParametersState,
  QueryParameterState,
} from './QueryParametersState';
import { QueryBuilderPostFilterState } from './QueryBuilderPostFilterState';
import {
  QueryBuilderPostFilterOperator_Equal,
  QueryBuilderPostFilterOperator_NotEqual,
} from './postFilterOperators/QueryBuilderPostFilterOperator_Equal';
import { QueryBuilderPostFilterOperator_LessThan } from './postFilterOperators/QueryBuilderPostFilterOperator_LessThan';
import { QueryBuilderPostFilterOperator_LessThanEqual } from './postFilterOperators/QueryBuilderPostFilterOperator_LessThanEqual';
import { QueryBuilderPostFilterOperator_GreaterThan } from './postFilterOperators/QueryBuilderPostFilterOperator_GreaterThan';
import { QueryBuilderPostFilterOperator_GreaterThanEqual } from './postFilterOperators/QueryBuilderPostFilterOperator_GreaterThanEqual';
import {
  QueryBuilderPostFilterOperator_NotStartWith,
  QueryBuilderPostFilterOperator_StartWith,
} from './postFilterOperators/QueryBuilderPostFilterOperator_StartWith';
import {
  QueryBuilderPostFilterOperator_Contain,
  QueryBuilderPostFilterOperator_NotContain,
} from './postFilterOperators/QueryBuilderPostFilterOperator_Contain';
import {
  QueryBuilderPostFilterOperator_EndWith,
  QueryBuilderPostFilterOperator_NotEndWith,
} from './postFilterOperators/QueryBuilderPostFilterOperator_EndWith';
import type { QueryBuilderPostFilterOperator } from './QueryBuilderPostFilterOperator';
import {
  QueryBuilderPostFilterOperator_In,
  QueryBuilderPostFilterOperator_NotIn,
} from './postFilterOperators/QueryBuilderPostFilterOperator_In';
import {
  QueryBuilderPostFilterOperator_IsEmpty,
  QueryBuilderPostFilterOperator_IsNotEmpty,
} from './postFilterOperators/QueryBuilderPostFilterOperator_IsEmpty';
import { QueryFunctionsExplorerState } from './QueryFunctionsExplorerState';

export abstract class QueryBuilderMode {
  abstract get isParametersDisabled(): boolean;

  abstract get isResultPanelHidden(): boolean;
}

export class StandardQueryBuilderMode extends QueryBuilderMode {
  get isParametersDisabled(): boolean {
    return false;
  }

  get isResultPanelHidden(): boolean {
    return false;
  }
}

export class QueryBuilderState {
  applicationStore: ApplicationStore<LegendApplicationConfig>;
  graphManagerState: GraphManagerState;

  mode: QueryBuilderMode;
  querySetupState: QueryBuilderSetupState;
  explorerState: QueryBuilderExplorerState;
  queryParametersState: QueryParametersState;
  queryFunctionsExplorerState: QueryFunctionsExplorerState;
  fetchStructureState: QueryBuilderFetchStructureState;
  filterState: QueryBuilderFilterState;
  postFilterState: QueryBuilderPostFilterState;
  resultSetModifierState: QueryResultSetModifierState;
  resultState: QueryBuilderResultState;
  queryTextEditorState: QueryTextEditorState;
  queryUnsupportedState: QueryBuilderUnsupportedState;
  observableContext: ObserverContext;
  filterOperators: QueryBuilderFilterOperator[] = [
    new QueryBuilderFilterOperator_Equal(),
    new QueryBuilderFilterOperator_NotEqual(),
    new QueryBuilderFilterOperator_LessThan(),
    new QueryBuilderFilterOperator_LessThanEqual(),
    new QueryBuilderFilterOperator_GreaterThan(),
    new QueryBuilderFilterOperator_GreaterThanEqual(),
    new QueryBuilderFilterOperator_StartWith(),
    new QueryBuilderFilterOperator_NotStartWith(),
    new QueryBuilderFilterOperator_Contain(),
    new QueryBuilderFilterOperator_NotContain(),
    new QueryBuilderFilterOperator_EndWith(),
    new QueryBuilderFilterOperator_NotEndWith(),
    new QueryBuilderFilterOperator_In(),
    new QueryBuilderFilterOperator_NotIn(),
    new QueryBuilderFilterOperator_IsEmpty(),
    new QueryBuilderFilterOperator_IsNotEmpty(),
  ];
  postFilterOperators: QueryBuilderPostFilterOperator[] = [
    new QueryBuilderPostFilterOperator_Equal(),
    new QueryBuilderPostFilterOperator_NotEqual(),
    new QueryBuilderPostFilterOperator_LessThan(),
    new QueryBuilderPostFilterOperator_LessThanEqual(),
    new QueryBuilderPostFilterOperator_GreaterThan(),
    new QueryBuilderPostFilterOperator_GreaterThanEqual(),
    new QueryBuilderPostFilterOperator_StartWith(),
    new QueryBuilderPostFilterOperator_NotStartWith(),
    new QueryBuilderPostFilterOperator_Contain(),
    new QueryBuilderPostFilterOperator_NotContain(),
    new QueryBuilderPostFilterOperator_EndWith(),
    new QueryBuilderPostFilterOperator_NotEndWith(),
    new QueryBuilderPostFilterOperator_In(),
    new QueryBuilderPostFilterOperator_NotIn(),
    new QueryBuilderPostFilterOperator_IsEmpty(),
    new QueryBuilderPostFilterOperator_IsNotEmpty(),
  ];
  isCompiling = false;
  backdrop = false;
  showFunctionPanel = false;
  showParameterPanel = true;

  constructor(
    applicationStore: ApplicationStore<LegendApplicationConfig>,
    graphManagerState: GraphManagerState,
    queryBuilderMode: QueryBuilderMode,
  ) {
    makeObservable(this, {
      querySetupState: observable,
      explorerState: observable,
      queryParametersState: observable,
      queryFunctionsExplorerState: observable,
      fetchStructureState: observable,
      filterState: observable,
      postFilterState: observable,
      resultSetModifierState: observable,
      resultState: observable,
      queryTextEditorState: observable,
      queryUnsupportedState: observable,
      isCompiling: observable,
      backdrop: observable,
      mode: observable,
      showFunctionPanel: observable,
      showParameterPanel: observable,
      setMode: action,
      resetQueryBuilder: action,
      resetQuerySetup: action,
      buildStateFromRawLambda: action,
      saveQuery: action,
      setBackdrop: action,
      setShowFunctionPanel: action,
      setShowParameterPanel: action,
      changeClass: action,
      changeFetchStructure: action,
      compileQuery: flow,
    });

    this.applicationStore = applicationStore;
    this.graphManagerState = graphManagerState;

    this.querySetupState = new QueryBuilderSetupState(this);
    this.explorerState = new QueryBuilderExplorerState(this);
    this.queryParametersState = new QueryParametersState(this);
    this.queryFunctionsExplorerState = new QueryFunctionsExplorerState(this);
    this.fetchStructureState = new QueryBuilderFetchStructureState(this);
    this.filterState = new QueryBuilderFilterState(this, this.filterOperators);
    this.postFilterState = new QueryBuilderPostFilterState(
      this,
      this.postFilterOperators,
    );
    this.resultSetModifierState = new QueryResultSetModifierState(this);
    this.resultState = new QueryBuilderResultState(this);
    this.queryTextEditorState = new QueryTextEditorState(this);
    this.queryUnsupportedState = new QueryBuilderUnsupportedState(this);
    this.mode = queryBuilderMode;
    this.observableContext = new ObserverContext(
      this.graphManagerState.pluginManager.getPureGraphManagerPlugins(),
    );
  }

  setMode(val: QueryBuilderMode): void {
    this.mode = val;
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
      const parameters = this.queryParametersState.parameters.map((e) =>
        this.graphManagerState.graphManager.serializeValueSpecification(
          e.parameter,
        ),
      );
      this.queryUnsupportedState.setRawLambda(
        new RawLambda(parameters, this.queryUnsupportedState.rawLambda?.body),
      );
      return guaranteeNonNullable(this.queryUnsupportedState.rawLambda);
    }
    return this.buildRawLambdaFromLambdaFunction(
      buildLambdaFunction(this, {
        keepSourceInformation: Boolean(options?.keepSourceInformation),
      }),
    );
  }

  resetQueryBuilder(): void {
    const resultState = new QueryBuilderResultState(this);
    resultState.setPreviewLimit(this.resultState.previewLimit);
    this.resultState = resultState;
    this.queryTextEditorState = new QueryTextEditorState(this);
    this.queryUnsupportedState = new QueryBuilderUnsupportedState(this);
  }

  resetQuerySetup(): void {
    this.explorerState = new QueryBuilderExplorerState(this);
    this.explorerState.refreshTreeData();
    this.queryParametersState = new QueryParametersState(this);
    this.queryFunctionsExplorerState = new QueryFunctionsExplorerState(this);
    const fetchStructureState = new QueryBuilderFetchStructureState(this);
    fetchStructureState.setFetchStructureMode(
      this.fetchStructureState.fetchStructureMode,
    );
    this.fetchStructureState = fetchStructureState;
    this.filterState = new QueryBuilderFilterState(this, this.filterOperators);
    this.postFilterState = new QueryBuilderPostFilterState(
      this,
      this.postFilterOperators,
    );
    this.resultSetModifierState = new QueryResultSetModifierState(this);
    this.fetchStructureState.graphFetchTreeState.initialize();
  }

  setQuerySetupState(val: QueryBuilderSetupState): void {
    this.querySetupState = val;
  }

  initialize(rawLambda: RawLambda, options?: { notifyError: boolean }): void {
    try {
      this.buildStateFromRawLambda(rawLambda);
    } catch (error) {
      assertErrorThrown(error);
      this.changeClass(undefined, true);
      const parameters = ((rawLambda.parameters ?? []) as object[]).map(
        (param) =>
          observe_ValueSpecification(
            this.graphManagerState.graphManager.buildValueSpecification(
              param as Record<PropertyKey, unknown>,
              this.graphManagerState.graph,
            ),
            this.observableContext,
          ),
      );
      processQueryParameters(
        parameters.filter(filterByType(VariableExpression)),
        this,
      );
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
    this.resetQuerySetup();
    if (!rawLambda.isStub) {
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
      const compiledLambda = guaranteeNonNullable(
        compiledValueSpecification.values[0],
      );
      processQueryBuilderLambdaFunction(this, compiledLambda);
    }
  }

  buildRawLambdaFromLambdaFunction(lambdaFunction: LambdaFunction): RawLambda {
    const lambdaFunctionInstanceValue = new LambdaFunctionInstanceValue(
      this.graphManagerState.graph.getTypicalMultiplicity(
        TYPICAL_MULTIPLICITY_TYPE.ONE,
      ),
      undefined,
    );
    lambdaFunctionInstanceValue.values = [lambdaFunction];
    return guaranteeType(
      this.graphManagerState.graphManager.buildRawValueSpecification(
        lambdaFunctionInstanceValue,
        this.graphManagerState.graph,
      ),
      RawLambda,
    );
  }

  buildMilestoningParameter(parameterName: string): ValueSpecification {
    const milestoningParameter = new VariableExpression(
      parameterName,
      this.graphManagerState.graph.getTypicalMultiplicity(
        TYPICAL_MULTIPLICITY_TYPE.ONE,
      ),
      GenericTypeExplicitReference.create(
        new GenericType(
          this.queryParametersState.queryBuilderState.graphManagerState.graph.getPrimitiveType(
            PRIMITIVE_TYPE.DATE,
          ),
        ),
      ),
    );
    if (
      !this.queryParametersState.parameters.find(
        (p) => p.variableName === parameterName,
      )
    ) {
      const variableState = new QueryParameterState(
        this.queryParametersState,
        milestoningParameter,
      );
      variableState.mockParameterValue();
      this.queryParametersState.addParameter(variableState);
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
    this.fetchStructureState.projectionState.clearCompilationError();
  }

  *compileQuery(): GeneratorFn<void> {
    if (!this.queryTextEditorState.mode) {
      this.isCompiling = true;
      this.clearCompilationError();
      // form mode
      try {
        this.queryTextEditorState.setCompilationError(undefined);
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
            !this.fetchStructureState.projectionState.revealCompilationError(
              error,
            );
        }

        // decide if we need to fall back to text mode for debugging
        if (fallbackToTextModeForDebugging) {
          this.applicationStore.notifyWarning(
            'Compilation failed and error cannot be located in form mode. Redirected to text mode for debugging.',
          );
          this.queryTextEditorState.openModal(QueryTextEditorMode.TEXT);
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
    } else if (this.queryTextEditorState.mode === QueryTextEditorMode.TEXT) {
      this.isCompiling = true;
      try {
        this.queryTextEditorState.setCompilationError(undefined);
        (yield this.graphManagerState.graphManager.getLambdaReturnType(
          this.queryTextEditorState.rawLambdaState.lambda,
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
            this.queryTextEditorState.setCompilationError(error);
          }
        }
      } finally {
        this.isCompiling = false;
      }
    }
  }

  changeClass(val: Class | undefined, isRebuildingState?: boolean): void {
    this.resetQueryBuilder();
    this.resetQuerySetup();
    this.querySetupState.setClass(val, isRebuildingState);
    this.explorerState.refreshTreeData();
  }

  changeFetchStructure(): void {
    this.resultSetModifierState = new QueryResultSetModifierState(this);
    const treeData = this.fetchStructureState.graphFetchTreeState.treeData;
    if (!treeData) {
      this.fetchStructureState.graphFetchTreeState.initialize();
    }
  }

  get classOptions(): PackageableElementOption<Class>[] {
    return this.graphManagerState.graph.ownClasses
      .concat(
        this.graphManagerState.filterSystemElementOptions(
          this.graphManagerState.graph.systemModel.ownClasses,
        ),
      )
      .concat(this.graphManagerState.graph.dependencyManager.classes)
      .map((e) => buildElementOption(e) as PackageableElementOption<Class>);
  }

  get enumerationOptions(): PackageableElementOption<Enumeration>[] {
    return this.graphManagerState.graph.ownEnumerations
      .concat(this.graphManagerState.graph.dependencyManager.enumerations)
      .map(
        (e) => buildElementOption(e) as PackageableElementOption<Enumeration>,
      );
  }

  getMappingOptions(): PackageableElementOption<Mapping>[] {
    return this.mappings.map(
      (e) => buildElementOption(e) as PackageableElementOption<Mapping>,
    );
  }

  get mappings(): Mapping[] {
    return this.graphManagerState.graph.ownMappings.concat(
      this.graphManagerState.graph.dependencyManager.mappings,
    );
  }

  getRuntimeOptions(): PackageableElementOption<PackageableRuntime>[] {
    return this.runtimes.map(
      (e) =>
        buildElementOption(e) as PackageableElementOption<PackageableRuntime>,
    );
  }

  get runtimes(): PackageableRuntime[] {
    return this.graphManagerState.graph.ownRuntimes.concat(
      this.graphManagerState.graph.dependencyManager.runtimes,
    );
  }

  getServiceOptions(): PackageableElementOption<Service>[] {
    return this.graphManagerState.graph.ownServices
      .concat(this.graphManagerState.graph.dependencyManager.services)
      .map((e) => buildElementOption(e) as PackageableElementOption<Service>);
  }
}
