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
import type { GeneratorFn } from '@finos/legend-shared';
import {
  LogEvent,
  assertErrorThrown,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import type { QueryBuilderFilterOperator } from './QueryBuilderFilterState';
import { QueryBuilderFilterState } from './QueryBuilderFilterState';
import { QueryBuilderFetchStructureState } from './QueryBuilderFetchStructureState';
import { QueryResultSetModifierState } from './QueryResultSetModifierState';
import {
  QueryTextEditorMode,
  QueryTextEditorState,
} from './QueryTextEditorState';
import { QueryBuilderSetupState } from './QueryBuilderSetupState';
import { QueryBuilderExplorerState } from './QueryBuilderExplorerState';
import { QueryBuilderResultState } from './QueryBuilderResultState';
import { processQueryBuilderLambdaFunction } from './QueryBuilderLambdaProcessor';
import { QueryBuilderUnsupportedState } from './QueryBuilderUnsupportedState';
import type {
  Class,
  Enumeration,
  GraphManagerState,
  LambdaFunction,
  Mapping,
  PackageableRuntime,
  Service,
  ValueSpecification,
} from '@finos/legend-graph';
import {
  GenericType,
  GenericTypeExplicitReference,
  Multiplicity,
  PRIMITIVE_TYPE,
  VariableExpression,
  GRAPH_MANAGER_LOG_EVENT,
  CompilationError,
  extractSourceInformationCoordinates,
  LambdaFunctionInstanceValue,
  RawLambda,
  TYPICAL_MULTIPLICITY_TYPE,
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
import {
  buildGetAllFunction,
  buildLambdaFunction,
} from './QueryBuilderLambdaBuilder';
import type {
  ApplicationStore,
  LegendApplicationConfig,
  PackageableElementOption,
} from '@finos/legend-application';
import { buildElementOption } from '@finos/legend-application';
import {
  QueryParametersState,
  QueryParameterState,
} from './QueryParametersState';
import { DEFAULT_MILESTONING_PARAMETER_NAME } from '../QueryBuilder_Const';

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
  fetchStructureState: QueryBuilderFetchStructureState;
  filterState: QueryBuilderFilterState;
  resultSetModifierState: QueryResultSetModifierState;
  resultState: QueryBuilderResultState;
  queryTextEditorState: QueryTextEditorState;
  queryUnsupportedState: QueryBuilderUnsupportedState;
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
  isCompiling = false;
  backdrop = false;

  constructor(
    applicationStore: ApplicationStore<LegendApplicationConfig>,
    graphManagerState: GraphManagerState,
    queryBuilderMode: QueryBuilderMode,
  ) {
    makeObservable(this, {
      querySetupState: observable,
      explorerState: observable,
      queryParametersState: observable,
      fetchStructureState: observable,
      filterState: observable,
      resultSetModifierState: observable,
      resultState: observable,
      queryTextEditorState: observable,
      queryUnsupportedState: observable,
      isCompiling: observable,
      backdrop: observable,
      mode: observable,
      classOptions: computed,
      mappingOptions: computed,
      runtimeOptions: computed,
      serviceOptions: computed,
      setMode: action,
      resetData: action,
      buildStateFromRawLambda: action,
      saveQuery: action,
      setBackdrop: action,
      compileQuery: flow,
    });

    this.applicationStore = applicationStore;
    this.graphManagerState = graphManagerState;

    this.querySetupState = new QueryBuilderSetupState(this);
    this.explorerState = new QueryBuilderExplorerState(this);
    this.queryParametersState = new QueryParametersState(this);
    this.fetchStructureState = new QueryBuilderFetchStructureState(this);
    this.filterState = new QueryBuilderFilterState(this, this.filterOperators);
    this.resultSetModifierState = new QueryResultSetModifierState(this);
    this.resultState = new QueryBuilderResultState(this);
    this.queryTextEditorState = new QueryTextEditorState(this);
    this.queryUnsupportedState = new QueryBuilderUnsupportedState(this);
    this.mode = queryBuilderMode;
  }

  setMode(val: QueryBuilderMode): void {
    this.mode = val;
  }

  setBackdrop(val: boolean): void {
    this.backdrop = val;
  }

  getQuery(options?: { keepSourceInformation: boolean }): RawLambda {
    return this.isQuerySupported()
      ? this.buildRawLambdaFromLambdaFunction(
          buildLambdaFunction(this, {
            keepSourceInformation: Boolean(options?.keepSourceInformation),
          }),
        )
      : guaranteeNonNullable(this.queryUnsupportedState.rawLambda);
  }

  resetData(): void {
    this.explorerState = new QueryBuilderExplorerState(this);
    this.queryParametersState = new QueryParametersState(this);
    const fetchStructureState = new QueryBuilderFetchStructureState(this);
    fetchStructureState.setFetchStructureMode(
      this.fetchStructureState.fetchStructureMode,
    );
    this.fetchStructureState = fetchStructureState;
    this.filterState = new QueryBuilderFilterState(this, this.filterOperators);
    this.resultSetModifierState = new QueryResultSetModifierState(this);
    const resultState = new QueryBuilderResultState(this);
    resultState.setPreviewLimit(this.resultState.previewLimit);
    this.resultState = resultState;
    this.queryTextEditorState = new QueryTextEditorState(this);
    this.queryUnsupportedState = new QueryBuilderUnsupportedState(this);
    this.explorerState.refreshTreeData();
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
      this.querySetupState.setClass(undefined, true);
      this.resetData();
      if (options?.notifyError) {
        this.applicationStore.notifyError(
          `Unable to initialize query builder: ${error.message}`,
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
    this.resetData();
    if (!rawLambda.isStub) {
      const valueSpec =
        this.graphManagerState.graphManager.buildValueSpecification(
          this.graphManagerState.graphManager.serializeRawValueSpecification(
            rawLambda,
          ),
          this.graphManagerState.graph,
        );
      const compiledValueSpecification = guaranteeType(
        valueSpec,
        LambdaFunctionInstanceValue,
      );
      const compiledLambda = guaranteeNonNullable(
        compiledValueSpecification.values[0],
      );
      processQueryBuilderLambdaFunction(this, compiledLambda);
    }
  }

  buildClassMilestoningValue(element: Class, stereotype: string): void {
    let milestoningParameters: VariableExpression[];
    switch (stereotype) {
      case 'businesstemporal': {
        const milestoningBusinessDateParameter = new VariableExpression(
          DEFAULT_MILESTONING_PARAMETER_NAME.BUSINESS_TEMPORAL,
          new Multiplicity(1, 1),
          GenericTypeExplicitReference.create(
            new GenericType(
              this.queryParametersState.queryBuilderState.graphManagerState.graph.getPrimitiveType(
                PRIMITIVE_TYPE.DATE,
              ),
            ),
          ),
        );
        milestoningParameters = [milestoningBusinessDateParameter];
        break;
      }
      case 'processingtemporal': {
        const milestoningProcessingDateParameter = new VariableExpression(
          DEFAULT_MILESTONING_PARAMETER_NAME.PROCESSING_TEMPORAL,
          new Multiplicity(1, 1),
          GenericTypeExplicitReference.create(
            new GenericType(
              this.queryParametersState.queryBuilderState.graphManagerState.graph.getPrimitiveType(
                PRIMITIVE_TYPE.DATE,
              ),
            ),
          ),
        );
        milestoningParameters = [milestoningProcessingDateParameter];
        break;
      }
      case 'bitemporal': {
        const milestoningBusinessDateParameter = new VariableExpression(
          DEFAULT_MILESTONING_PARAMETER_NAME.BUSINESS_TEMPORAL,
          new Multiplicity(1, 1),
          GenericTypeExplicitReference.create(
            new GenericType(
              this.queryParametersState.queryBuilderState.graphManagerState.graph.getPrimitiveType(
                PRIMITIVE_TYPE.DATE,
              ),
            ),
          ),
        );
        const milestoningProcessingDateParameter = new VariableExpression(
          DEFAULT_MILESTONING_PARAMETER_NAME.PROCESSING_TEMPORAL,
          new Multiplicity(1, 1),
          GenericTypeExplicitReference.create(
            new GenericType(
              this.queryParametersState.queryBuilderState.graphManagerState.graph.getPrimitiveType(
                PRIMITIVE_TYPE.DATE,
              ),
            ),
          ),
        );
        milestoningParameters = [
          milestoningBusinessDateParameter,
          milestoningProcessingDateParameter,
        ];
        break;
      }
      default:
        milestoningParameters = [];
    }
    const getAllFunction = buildGetAllFunction(
      element,
      this.graphManagerState.graph.getTypicalMultiplicity(
        TYPICAL_MULTIPLICITY_TYPE.ONE,
      ),
    );
    milestoningParameters.forEach((parameter) => {
      if (parameter instanceof VariableExpression) {
        const parameterState = new QueryParameterState(
          this.queryParametersState,
          parameter,
        );
        parameterState.mockParameterValues();
        this.queryParametersState.addParameter(parameterState);
        getAllFunction.parametersValues.push(
          guaranteeNonNullable(
            parameterState,
            `Milestoning class should have a parameter of type 'Date'`,
          ).parameter,
        );
      }
    });
    this.querySetupState.setClassMilestoningValue(milestoningParameters);
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

  async saveQuery(
    onSaveQuery: (lambda: RawLambda) => Promise<void>,
  ): Promise<void> {
    try {
      const rawLambda = this.getQuery();
      await onSaveQuery(rawLambda);
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notifyError(
        `Unable to save query: ${error.message}`,
      );
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
          LogEvent.create(GRAPH_MANAGER_LOG_EVENT.COMPILATION_FAILURE),
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
            LogEvent.create(GRAPH_MANAGER_LOG_EVENT.COMPILATION_FAILURE),
            error,
          );
          this.applicationStore.notifyWarning(
            `Compilaion failed: ${error.message}`,
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

  get mappingOptions(): PackageableElementOption<Mapping>[] {
    return this.mappings.map(
      (e) => buildElementOption(e) as PackageableElementOption<Mapping>,
    );
  }

  get mappings(): Mapping[] {
    return this.graphManagerState.graph.ownMappings.concat(
      this.graphManagerState.graph.dependencyManager.mappings,
    );
  }

  get runtimeOptions(): PackageableElementOption<PackageableRuntime>[] {
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

  get serviceOptions(): PackageableElementOption<Service>[] {
    return this.graphManagerState.graph.ownServices
      .concat(this.graphManagerState.graph.dependencyManager.services)
      .map((e) => buildElementOption(e) as PackageableElementOption<Service>);
  }
}
