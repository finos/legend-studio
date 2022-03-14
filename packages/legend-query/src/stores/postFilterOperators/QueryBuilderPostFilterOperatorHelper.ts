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
  type Multiplicity,
  type FunctionExpression,
  AbstractPropertyExpression,
  extractElementNameFromPath,
  GenericType,
  GenericTypeExplicitReference,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
  SimpleFunctionExpression,
  TYPICAL_MULTIPLICITY_TYPE,
  VariableExpression,
} from '@finos/legend-graph';
import {
  guaranteeNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { TDS_ROW } from '../../QueryBuilder_Const';
import { QueryBuilderAggregateColumnState } from '../QueryBuilderAggregationState';
import type { QueryBuilderPostFilterOperator } from '../QueryBuilderPostFilterOperator';
import {
  type PostFilterConditionState,
  type TDS_COLUMN_GETTERS,
  getTDSColumnDerivedProperyFromType,
} from '../QueryBuilderPostFilterState';
import {
  type QueryBuilderProjectionColumnState,
  QueryBuilderSimpleProjectionColumnState,
} from '../QueryBuilderProjectionState';

export const getColumnMultiplicity = (
  columnState:
    | QueryBuilderProjectionColumnState
    | QueryBuilderAggregateColumnState,
): Multiplicity => {
  if (columnState instanceof QueryBuilderAggregateColumnState) {
    return columnState.aggregationState.projectionState.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
  } else if (columnState instanceof QueryBuilderSimpleProjectionColumnState) {
    return columnState.propertyExpressionState.propertyExpression.func
      .multiplicity;
  }
  throw new UnsupportedOperationError(
    'Unable to get multiplicity from column state',
    columnState,
  );
};

export const buildPostFilterConditionExpression = (
  filterConditionState: PostFilterConditionState,
  operator: QueryBuilderPostFilterOperator,
): FunctionExpression => {
  // primitives
  const graph =
    filterConditionState.postFilterState.queryBuilderState.graphManagerState
      .graph;
  const multiplicityOne = graph.getTypicalMultiplicity(
    TYPICAL_MULTIPLICITY_TYPE.ONE,
  );
  const typeString = graph.getPrimitiveType(PRIMITIVE_TYPE.STRING);
  // property expression
  const colState = filterConditionState.columnState;
  const tdsPropertyExpression = new AbstractPropertyExpression(
    '',
    multiplicityOne,
  );
  let tdsDerivedPropertyName: TDS_COLUMN_GETTERS;
  const correspondingTdsDerivedProperty = operator.getTdsColumnGetter();
  if (correspondingTdsDerivedProperty) {
    tdsDerivedPropertyName = correspondingTdsDerivedProperty;
  } else {
    const type = guaranteeNonNullable(colState.getReturnType());
    tdsDerivedPropertyName = getTDSColumnDerivedProperyFromType(type);
  }
  tdsPropertyExpression.func = guaranteeNonNullable(
    graph
      .getClass(TDS_ROW)
      .getAllDerivedProperties()
      .find((p) => p.name === tdsDerivedPropertyName),
  );
  const variableName = new VariableExpression(
    filterConditionState.postFilterState.lambdaParameterName,
    multiplicityOne,
  );
  const colInstanceValue = new PrimitiveInstanceValue(
    GenericTypeExplicitReference.create(new GenericType(typeString)),
    multiplicityOne,
  );
  colInstanceValue.values = [colState.columnName];
  tdsPropertyExpression.parametersValues = [variableName, colInstanceValue];

  const pureFunction = operator.getPureFunction();
  if (pureFunction) {
    const expression = new SimpleFunctionExpression(
      extractElementNameFromPath(pureFunction),
      multiplicityOne,
    );
    expression.parametersValues.push(tdsPropertyExpression);
    if (filterConditionState.value) {
      expression.parametersValues.push(filterConditionState.value);
    }
    return expression;
  } else {
    return tdsPropertyExpression;
  }
};
