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

import { guaranteeNonNullable } from '@finos/legend-studio-shared';
import type { Class, Multiplicity } from '@finos/legend-studio';
import {
  InstanceValue,
  PackageableElementExplicitReference,
  CollectionInstanceValue,
  CORE_ELEMENT_PATH,
  FunctionType,
  GenericType,
  GenericTypeExplicitReference,
  LambdaFunction,
  LambdaFunctionInstanceValue,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
  RootGraphFetchTreeInstanceValue,
  SimpleFunctionExpression,
  SUPPORTED_FUNCTIONS,
  TYPICAL_MULTIPLICITY_TYPE,
  VariableExpression,
} from '@finos/legend-studio';
import { isGraphFetchTreeDataEmpty } from './QueryBuilderGraphFetchTreeUtil';
import type { QueryBuilderState } from './QueryBuilderState';
import { buildFilterConditionExpressions } from './QueryBuilderFilterState';

const buildGetAllFunction = (
  _class: Class,
  multiplicity: Multiplicity,
): SimpleFunctionExpression => {
  const _func = new SimpleFunctionExpression(
    SUPPORTED_FUNCTIONS.GET_ALL,
    multiplicity,
  );
  const classInstance = new InstanceValue(
    multiplicity,
    GenericTypeExplicitReference.create(new GenericType(_class)),
  );
  classInstance.values[0] = PackageableElementExplicitReference.create(_class);
  _func.parametersValues.push(classInstance);
  return _func;
};

const buildFilterExpression = (
  queryBuilderState: QueryBuilderState,
  getAllFunc: SimpleFunctionExpression,
): SimpleFunctionExpression | undefined => {
  const lambdaVariable = new VariableExpression(
    queryBuilderState.filterState.lambdaVariableName,
    queryBuilderState.editorStore.graphState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    ),
  );
  const filterConditionExpressions = buildFilterConditionExpressions(
    queryBuilderState.filterState,
  );
  if (!filterConditionExpressions) {
    return undefined;
  }
  const typeAny = queryBuilderState.editorStore.graphState.graph.getClass(
    CORE_ELEMENT_PATH.ANY,
  );
  const multiplicityOne =
    queryBuilderState.editorStore.graphState.graph.getTypicalMultiplicity(
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
  colLambdaFunction.expressionSequence = filterConditionExpressions;
  filterLambda.values.push(colLambdaFunction);
  filterExpression.parametersValues.push(filterLambda);
  return filterExpression;
};

export const buildLambdaFunction = (
  queryBuilderState: QueryBuilderState,
  options?: {
    /**
     * Set queryBuilderState to `true` when we construct query for execution within the app.
     * queryBuilderState will make the lambda function building process overrides several query values, such as the row limit.
     */
    isBuildingExecutionQuery?: boolean;
  },
): LambdaFunction => {
  const _class = guaranteeNonNullable(
    queryBuilderState.querySetupState._class,
    'Class is required to execute query',
  );
  const multiplicityOne =
    queryBuilderState.editorStore.graphState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
  const stringType =
    queryBuilderState.editorStore.graphState.graph.getPrimitiveType(
      PRIMITIVE_TYPE.STRING,
    );
  const typeAny = queryBuilderState.editorStore.graphState.graph.getClass(
    CORE_ELEMENT_PATH.ANY,
  );
  const lambdaFunction = new LambdaFunction(
    new FunctionType(typeAny, multiplicityOne),
  );
  // build base `getAll` function
  const _getAllFunc = buildGetAllFunction(_class, multiplicityOne);
  lambdaFunction.expressionSequence[0] = _getAllFunc;
  const filterFunction = buildFilterExpression(queryBuilderState, _getAllFunc);
  if (filterFunction) {
    lambdaFunction.expressionSequence[0] = filterFunction;
  }
  // add `fetch` function
  if (
    queryBuilderState.fetchStructureState.isProjectionMode() &&
    queryBuilderState.fetchStructureState.projectionState.columns.length
  ) {
    const projectFunction = new SimpleFunctionExpression(
      SUPPORTED_FUNCTIONS.PROJECT,
      multiplicityOne,
    );
    const colLambdas = new CollectionInstanceValue(multiplicityOne);
    const colNames = new CollectionInstanceValue(multiplicityOne);
    queryBuilderState.fetchStructureState.projectionState.columns.forEach(
      (projection) => {
        const lambdaVariable = new VariableExpression(
          projection.lambdaVariableName,
          queryBuilderState.editorStore.graphState.graph.getTypicalMultiplicity(
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
      },
    );
    const expression = lambdaFunction.expressionSequence[0];
    projectFunction.parametersValues = [expression, colLambdas, colNames];
    lambdaFunction.expressionSequence[0] = projectFunction;
  } else if (
    queryBuilderState.fetchStructureState.isGraphFetchMode() &&
    queryBuilderState.fetchStructureState.graphFetchTreeState.treeData &&
    !isGraphFetchTreeDataEmpty(
      queryBuilderState.fetchStructureState.graphFetchTreeState.treeData,
    )
  ) {
    const graphFetchInstance = new RootGraphFetchTreeInstanceValue(
      multiplicityOne,
    );
    graphFetchInstance.values = [
      queryBuilderState.fetchStructureState.graphFetchTreeState.treeData.tree,
    ];
    const serializeFunction = new SimpleFunctionExpression(
      SUPPORTED_FUNCTIONS.SERIALIZE,
      multiplicityOne,
    );
    const graphFetchFunc = new SimpleFunctionExpression(
      queryBuilderState.fetchStructureState.graphFetchTreeState.isChecked
        ? SUPPORTED_FUNCTIONS.GRAPH_FETCH_CHECKED
        : SUPPORTED_FUNCTIONS.GRAPH_FETCH,
      multiplicityOne,
    );
    const expression = lambdaFunction.expressionSequence[0];
    graphFetchFunc.parametersValues = [expression, graphFetchInstance];
    serializeFunction.parametersValues = [graphFetchFunc, graphFetchInstance];
    lambdaFunction.expressionSequence[0] = serializeFunction;
  }
  // apply result set modifier options
  queryBuilderState.resultSetModifierState.processModifiersOnLambda(
    lambdaFunction,
    {
      overridingLimit: options?.isBuildingExecutionQuery
        ? queryBuilderState.resultState.previewLimit
        : undefined,
    },
  );
  return lambdaFunction;
};
