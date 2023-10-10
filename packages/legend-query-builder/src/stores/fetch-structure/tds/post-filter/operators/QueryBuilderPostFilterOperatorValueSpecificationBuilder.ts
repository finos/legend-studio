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
  type FunctionExpression,
  AbstractPropertyExpression,
  extractElementNameFromPath,
  GenericType,
  GenericTypeExplicitReference,
  PrimitiveInstanceValue,
  SimpleFunctionExpression,
  VariableExpression,
  getAllClassDerivedProperties,
  PropertyExplicitReference,
  Multiplicity,
  PrimitiveType,
  type PureModel,
} from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import type { QueryBuilderPostFilterOperator } from '../QueryBuilderPostFilterOperator.js';
import { type PostFilterConditionState } from '../QueryBuilderPostFilterState.js';
import {
  QUERY_BUILDER_PURE_PATH,
  type TDS_COLUMN_GETTER,
} from '../../../../../graph/QueryBuilderMetaModelConst.js';
import type { QueryBuilderTDSColumnState } from '../../QueryBuilderTDSColumnState.js';
import { getTDSColumnDerivedProperyFromType } from '../../QueryBuilderTDSHelper.js';

export const buildtdsPropertyExpressionFromColState = (
  filterConditionState: PostFilterConditionState,
  colState: QueryBuilderTDSColumnState,
  graph: PureModel,
  operator: QueryBuilderPostFilterOperator | undefined,
): AbstractPropertyExpression => {
  const tdsPropertyExpression = new AbstractPropertyExpression('');
  let tdsDerivedPropertyName: TDS_COLUMN_GETTER;
  const correspondingTDSDerivedProperty = operator
    ? operator.getTDSColumnGetter()
    : undefined;
  if (correspondingTDSDerivedProperty) {
    tdsDerivedPropertyName = correspondingTDSDerivedProperty;
  } else {
    const type = guaranteeNonNullable(colState.getColumnType());
    tdsDerivedPropertyName = getTDSColumnDerivedProperyFromType(type);
  }
  tdsPropertyExpression.func = PropertyExplicitReference.create(
    guaranteeNonNullable(
      getAllClassDerivedProperties(
        graph.getClass(QUERY_BUILDER_PURE_PATH.TDS_ROW),
      ).find((p) => p.name === tdsDerivedPropertyName),
    ),
  );
  const variableName = new VariableExpression(
    filterConditionState.postFilterState.lambdaParameterName,
    Multiplicity.ONE,
  );
  const colInstanceValue = new PrimitiveInstanceValue(
    GenericTypeExplicitReference.create(new GenericType(PrimitiveType.STRING)),
  );
  colInstanceValue.values = [colState.columnName];
  tdsPropertyExpression.parametersValues = [variableName, colInstanceValue];
  return tdsPropertyExpression;
};

export const buildPostFilterConditionExpression = (
  filterConditionState: PostFilterConditionState,
  operator: QueryBuilderPostFilterOperator,
  /**
   * If provided, this will be used to construct the simple
   * function expression for the function with the specified
   * name. If not provided, we will fall back to use the TDS column getter function expression.
   * This is the case because with TDS, we are provided some filter-like operators, e.g. IS_NULL, IS_NOT_NULL, etc.
   */
  operatorFunctionFullPath: string | undefined,
): FunctionExpression => {
  // primitives
  const graph =
    filterConditionState.postFilterState.tdsState.queryBuilderState
      .graphManagerState.graph;
  // property expression
  const tdsPropertyExpression = buildtdsPropertyExpressionFromColState(
    filterConditionState,
    filterConditionState.leftConditionValue,
    graph,
    operator,
  );

  if (operatorFunctionFullPath) {
    const expression = new SimpleFunctionExpression(
      extractElementNameFromPath(operatorFunctionFullPath),
    );
    expression.parametersValues.push(tdsPropertyExpression);
    filterConditionState.rightConditionValue.appendConditionValue(expression);
    return expression;
  } else {
    return tdsPropertyExpression;
  }
};
