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

import { action, flow, flowResult, observable, makeObservable } from 'mobx';
import type { GeneratorFn } from '@finos/legend-studio-shared';
import {
  assertErrorThrown,
  changeEntry,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-studio-shared';
import type { QueryBuilderOperator } from './QueryBuilderFilterState';
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
import { QueryBuilderLambdaProcessor } from './QueryBuilderLambdaProcessor';
import { QueryBuilderUnsupportedState } from './QueryBuilderUnsupportedState';
import type { EditorStore } from '@finos/legend-studio';
import {
  EditorExtensionState,
  CollectionInstanceValue,
  CompilationError,
  CORE_ELEMENT_PATH,
  CORE_LOG_EVENT,
  EngineError,
  FunctionType,
  GenericType,
  GenericTypeExplicitReference,
  getAllFunction,
  getElementCoordinates,
  LambdaFunction,
  LambdaFunctionInstanceValue,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
  RawLambda,
  RootGraphFetchTreeInstanceValue,
  SimpleFunctionExpression,
  SUPPORTED_FUNCTIONS,
  TYPICAL_MULTIPLICITY_TYPE,
  VariableExpression,
} from '@finos/legend-studio';
import {
  QueryBuilderEqualOperator,
  QueryBuilderNotEqualOperator,
} from './operators/QueryBuilderEqualOperator';
import { QueryBuilderGreaterThanOperator } from './operators/QueryBuilderGreaterThanOperator';
import {
  QueryBuilderNotStartWithOperator,
  QueryBuilderStartWithOperator,
} from './operators/QueryBuilderStartWithOperator';
import { QueryBuilderGreaterThanEqualOperator } from './operators/QueryBuilderGreaterThanEqualOperator';
import { QueryBuilderLessThanEqualOperator } from './operators/QueryBuilderLessThanEqualOperator';
import { QueryBuilderLessThanOperator } from './operators/QueryBuilderLessThanOperator';
import {
  QueryBuilderEndWithOperator,
  QueryBuilderNotEndWithOperator,
} from './operators/QueryBuilderEndWithOperator';
import {
  QueryBuilderContainOperator,
  QueryBuilderNotContainOperator,
} from './operators/QueryBuilderContainOperator';
import {
  QueryBuilderIsEmptyOperator,
  QueryBuilderIsNotEmptyOperator,
} from './operators/QueryBuilderIsEmptyOperator';
import {
  QueryBuilderInOperator,
  QueryBuilderNotInOperator,
} from './operators/QueryBuilderInOperator';

export class QueryBuilderState extends EditorExtensionState {
  editorStore: EditorStore;
  querySetupState: QueryBuilderSetupState;
  explorerState: QueryBuilderExplorerState;
  fetchStructureState: QueryBuilderFetchStructureState;
  filterState: QueryBuilderFilterState;
  resultSetModifierState: QueryResultSetModifierState;
  resultState: QueryBuilderResultState;
  queryTextEditorState: QueryTextEditorState;
  queryUnsupportedState: QueryBuilderUnsupportedState;
  openQueryBuilder = false;
  operators: QueryBuilderOperator[] = [
    new QueryBuilderEqualOperator(),
    new QueryBuilderNotEqualOperator(),
    new QueryBuilderLessThanOperator(),
    new QueryBuilderLessThanEqualOperator(),
    new QueryBuilderGreaterThanOperator(),
    new QueryBuilderGreaterThanEqualOperator(),
    new QueryBuilderStartWithOperator(),
    new QueryBuilderNotStartWithOperator(),
    new QueryBuilderContainOperator(),
    new QueryBuilderNotContainOperator(),
    new QueryBuilderEndWithOperator(),
    new QueryBuilderNotEndWithOperator(),
    new QueryBuilderInOperator(),
    new QueryBuilderNotInOperator(),
    new QueryBuilderIsEmptyOperator(),
    new QueryBuilderIsNotEmptyOperator(),
  ];

  constructor(editorStore: EditorStore) {
    super();

    makeObservable(this, {
      querySetupState: observable,
      explorerState: observable,
      fetchStructureState: observable,
      filterState: observable,
      resultSetModifierState: observable,
      resultState: observable,
      queryTextEditorState: observable,
      queryUnsupportedState: observable,
      openQueryBuilder: observable,
      setOpenQueryBuilder: flow,
      reset: action,
      resetData: action,
      buildWithRawLambda: action,
      saveQuery: action,
    });

    this.editorStore = editorStore;
    this.querySetupState = new QueryBuilderSetupState(editorStore, this);
    this.explorerState = new QueryBuilderExplorerState(editorStore, this);
    this.fetchStructureState = new QueryBuilderFetchStructureState(
      editorStore,
      this,
    );
    this.filterState = new QueryBuilderFilterState(
      editorStore,
      this,
      this.operators,
    );
    this.resultSetModifierState = new QueryResultSetModifierState(
      editorStore,
      this,
    );
    this.resultState = new QueryBuilderResultState(editorStore, this);
    this.queryTextEditorState = new QueryTextEditorState(editorStore, this);
    this.queryUnsupportedState = new QueryBuilderUnsupportedState(
      editorStore,
      this,
    );
  }

  getRawLambdaQuery(): RawLambda {
    return this.isQuerySupported()
      ? this.buildRawLambdaFromLambdaFunction(this.buildLambdaFunction())
      : guaranteeNonNullable(this.queryUnsupportedState.rawLambda);
  }

  /**
   * When opening query builder, we ensure the graph compiles successfully
   */
  *setOpenQueryBuilder(
    val: boolean,
    options?: { disableCompile: boolean },
  ): GeneratorFn<void> {
    if (!this.editorStore.isInFormMode) {
      return;
    }
    if (val === this.openQueryBuilder) {
      return;
    }
    if (val) {
      if (!options?.disableCompile) {
        yield flowResult(
          this.editorStore.graphState.globalCompileInFormMode({
            disableNotificationOnSuccess: true,
          }),
        );
      }
      if (!this.editorStore.graphState.compilationError) {
        this.openQueryBuilder = val;
      }
    } else {
      this.openQueryBuilder = val;
    }
  }

  reset(): void {
    changeEntry(
      this.editorStore.editorExtensionStates,
      this.editorStore.getEditorExtensionState(QueryBuilderState),
      new QueryBuilderState(this.editorStore),
    );
  }

  resetData(): void {
    this.explorerState = new QueryBuilderExplorerState(this.editorStore, this);
    const fetchStructureState = new QueryBuilderFetchStructureState(
      this.editorStore,
      this,
    );
    fetchStructureState.setFetchStructureMode(
      this.fetchStructureState.fetchStructureMode,
    );
    this.fetchStructureState = fetchStructureState;
    this.filterState = new QueryBuilderFilterState(
      this.editorStore,
      this,
      this.operators,
    );
    this.resultSetModifierState = new QueryResultSetModifierState(
      this.editorStore,
      this,
    );
    const resultState = new QueryBuilderResultState(this.editorStore, this);
    resultState.setPreviewLimit(this.resultState.previewLimit);
    this.resultState = resultState;
    this.queryTextEditorState = new QueryTextEditorState(
      this.editorStore,
      this,
    );
    this.queryUnsupportedState = new QueryBuilderUnsupportedState(
      this.editorStore,
      this,
    );
    this.explorerState.refreshTreeData();
    this.fetchStructureState.graphFetchTreeState.init();
  }

  setQuerySetupState(val: QueryBuilderSetupState): void {
    this.querySetupState = val;
  }

  buildLambdaFunction(options?: {
    /**
     * Set this to `true` when we construct query for execution within the app.
     * This will make the lambda function building process overrides several query values, such as the row limit.
     */
    isBuildingExecutionQuery?: boolean;
  }): LambdaFunction {
    const _class = guaranteeNonNullable(
      this.querySetupState._class,
      'Class is required to execute query',
    );
    const multiplicityOne =
      this.editorStore.graphState.graph.getTypicalMultiplicity(
        TYPICAL_MULTIPLICITY_TYPE.ONE,
      );
    const stringType = this.editorStore.graphState.graph.getPrimitiveType(
      PRIMITIVE_TYPE.STRING,
    );
    const typeAny = this.editorStore.graphState.graph.getClass(
      CORE_ELEMENT_PATH.ANY,
    );
    const lambdaFunction = new LambdaFunction(
      new FunctionType(typeAny, multiplicityOne),
    );
    // build base `getAll` function
    const _getAllFunc = getAllFunction(_class, multiplicityOne);
    lambdaFunction.expressionSequence[0] = _getAllFunc;
    const filterFunction = this.buildFilterExpression(_getAllFunc);
    if (filterFunction) {
      lambdaFunction.expressionSequence[0] = filterFunction;
    }
    // add `fetch` function
    if (
      this.fetchStructureState.isProjectionMode() &&
      this.fetchStructureState.projectionColumns.length
    ) {
      const projectFunction = new SimpleFunctionExpression(
        SUPPORTED_FUNCTIONS.PROJECT,
        multiplicityOne,
      );
      const colLambdas = new CollectionInstanceValue(multiplicityOne);
      const colNames = new CollectionInstanceValue(multiplicityOne);
      this.fetchStructureState.projectionColumns.forEach((projection) => {
        const lambdaVariable = new VariableExpression(
          projection.lambdaVariableName,
          this.editorStore.graphState.graph.getTypicalMultiplicity(
            TYPICAL_MULTIPLICITY_TYPE.ONE,
          ),
        );
        // Add column name
        const colName = new PrimitiveInstanceValue(
          GenericTypeExplicitReference.create(new GenericType(stringType)),
          multiplicityOne,
        );
        colName.values.push(projection.columnName);
        colNames.values.push(colName);
        // Add column projection
        const colLambda = new LambdaFunctionInstanceValue(multiplicityOne);
        const colLambdaFunctionType = new FunctionType(
          typeAny,
          multiplicityOne,
        );
        colLambdaFunctionType.parameters.push(lambdaVariable);
        const colLambdaFunction = new LambdaFunction(colLambdaFunctionType);
        colLambdaFunction.expressionSequence.push(
          projection.propertyEditorState.propertyExpression,
        );
        colLambda.values.push(colLambdaFunction);
        colLambdas.values.push(colLambda);
      });
      const expression = lambdaFunction.expressionSequence[0];
      projectFunction.parametersValues = [expression, colLambdas, colNames];
      lambdaFunction.expressionSequence[0] = projectFunction;
    } else if (
      this.fetchStructureState.isGraphFetchMode() &&
      this.fetchStructureState.graphFetchTreeState.graphFetchTree
    ) {
      const graphFetchTreeState =
        this.fetchStructureState.graphFetchTreeState.graphFetchTree;
      const root = graphFetchTreeState.root;
      const graphFetchInstance = new RootGraphFetchTreeInstanceValue(
        multiplicityOne,
      );
      graphFetchInstance.values = [root.graphFetchTreeNode];
      const serializeFunction = new SimpleFunctionExpression(
        SUPPORTED_FUNCTIONS.SERIALIZE,
        multiplicityOne,
      );
      const graphFetchCheckedFunc = new SimpleFunctionExpression(
        SUPPORTED_FUNCTIONS.GRAPH_FETCH_CHECKED,
        multiplicityOne,
      );
      const expression = lambdaFunction.expressionSequence[0];
      graphFetchCheckedFunc.parametersValues = [expression, graphFetchInstance];
      serializeFunction.parametersValues = [
        graphFetchCheckedFunc,
        graphFetchInstance,
      ];
      lambdaFunction.expressionSequence[0] = serializeFunction;
    }
    // apply result set modifier options
    this.resultSetModifierState.processModifiersOnLambda(lambdaFunction, {
      overridingLimit: options?.isBuildingExecutionQuery
        ? this.resultState.previewLimit
        : undefined,
    });
    return lambdaFunction;
  }

  buildFilterExpression(
    getAllFunc: SimpleFunctionExpression,
  ): SimpleFunctionExpression | undefined {
    const lambdaVariable = new VariableExpression(
      this.filterState.lambdaVariableName,
      this.editorStore.graphState.graph.getTypicalMultiplicity(
        TYPICAL_MULTIPLICITY_TYPE.ONE,
      ),
    );
    const parameters = this.filterState.getParameterValues();
    if (!parameters) {
      return undefined;
    }
    const typeAny = this.editorStore.graphState.graph.getClass(
      CORE_ELEMENT_PATH.ANY,
    );
    const multiplicityOne =
      this.editorStore.graphState.graph.getTypicalMultiplicity(
        TYPICAL_MULTIPLICITY_TYPE.ONE,
      );
    // main filter expression
    const filterExpression = new SimpleFunctionExpression(
      SUPPORTED_FUNCTIONS.FILTER,
      multiplicityOne,
    );
    // param [0]
    filterExpression.parametersValues.push(getAllFunc);
    // param [1]
    const filterLambda = new LambdaFunctionInstanceValue(multiplicityOne);
    const filterLambdaFunctionType = new FunctionType(typeAny, multiplicityOne);
    filterLambdaFunctionType.parameters.push(lambdaVariable);
    const colLambdaFunction = new LambdaFunction(filterLambdaFunctionType);
    colLambdaFunction.expressionSequence = parameters;
    filterLambda.values.push(colLambdaFunction);
    filterExpression.parametersValues.push(filterLambda);
    return filterExpression;
  }

  initWithRawLambda(
    rawLambda: RawLambda,
    options?: { notifyError: boolean },
  ): void {
    try {
      this.buildWithRawLambda(rawLambda);
    } catch (error: unknown) {
      this.querySetupState.setClass(undefined, true);
      this.resetData();
      assertErrorThrown(error);
      if (options?.notifyError) {
        this.editorStore.applicationStore.notifyError(
          `Unable to build query builder: ${error.message}`,
        );
      }
      this.queryUnsupportedState.setLambdaError(error);
      this.queryUnsupportedState.setRawLambda(rawLambda);
    }
  }

  /**
   * Using the rawLambda, this query builder is rebuilt
   * @throws error if there is an issue building the compiled lambda or rebuilding the state.
   * consumers of function should handle the errors
   * @param rawLambda
   */
  buildWithRawLambda(rawLambda: RawLambda): void {
    this.resetData();
    if (!rawLambda.isStub) {
      const compiledLambda = this.buildLambdaFunctionFromRawLambda(rawLambda);
      compiledLambda.expressionSequence.map((e) =>
        e.accept_ValueSpecificationVisitor(
          new QueryBuilderLambdaProcessor(this, undefined),
        ),
      );
    }
  }

  buildLambdaFunctionFromRawLambda(rawLambda: RawLambda): LambdaFunction {
    const valueSpec =
      this.editorStore.graphState.graphManager.buildValueSpecification(
        rawLambda,
        this.editorStore.graphState.graph,
      );
    const compiledValueSpecification = guaranteeType(
      valueSpec,
      LambdaFunctionInstanceValue,
    );
    return guaranteeNonNullable(compiledValueSpecification.values[0]);
  }

  buildRawLambdaFromLambdaFunction(lambdaFunction: LambdaFunction): RawLambda {
    const lambdaFunctionInstanceValue = new LambdaFunctionInstanceValue(
      this.editorStore.graphState.graph.getTypicalMultiplicity(
        TYPICAL_MULTIPLICITY_TYPE.ONE,
      ),
      undefined,
    );
    lambdaFunctionInstanceValue.values = [lambdaFunction];
    return guaranteeType(
      this.editorStore.graphState.graphManager.buildRawValueSpecification(
        lambdaFunctionInstanceValue,
        this.editorStore.graphState.graph,
      ),
      RawLambda,
    );
  }

  async saveQuery(): Promise<void> {
    const onQuerySave = this.querySetupState.onSave;
    if (onQuerySave) {
      try {
        const rawLambda = this.getRawLambdaQuery();
        await onQuerySave(rawLambda);
      } catch (error: unknown) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.notifyError(
          `Unable to save query: ${error.message}`,
        );
      }
    }
  }

  isEditingInTextMode(): boolean {
    return (
      this.openQueryBuilder &&
      this.queryTextEditorState.mode === QueryTextEditorMode.TEXT
    );
  }

  isQuerySupported(): boolean {
    return !this.queryUnsupportedState.rawLambda;
  }

  compileQuery = flow(function* (this: QueryBuilderState) {
    if (this.isEditingInTextMode()) {
      try {
        this.editorStore.graphState.clearCompilationError();
        (yield this.editorStore.graphState.graphManager.getLambdaReturnType(
          this.queryTextEditorState.rawLambdaState.lambda,
          this.editorStore.graphState.graph,
        )) as string;
        this.editorStore.applicationStore.notifySuccess('Compiled sucessfully');
      } catch (error: unknown) {
        assertErrorThrown(error);
        if (error instanceof EngineError) {
          this.editorStore.graphState.setCompilationError(error);
        }
        this.editorStore.applicationStore.logger.error(
          CORE_LOG_EVENT.COMPILATION_PROBLEM,
          error,
        );
        const compilationError = this.editorStore.graphState.compilationError;
        if (compilationError instanceof CompilationError) {
          const errorElementCoordinates = getElementCoordinates(
            compilationError.sourceInformation,
          );
          if (errorElementCoordinates) {
            this.queryTextEditorState.setCompilationError(compilationError);
          }
        }
      }
    }
  });
}
