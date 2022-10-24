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
  PRIMITIVE_TYPE,
  SimpleFunctionExpression,
  TYPICAL_MULTIPLICITY_TYPE,
  VariableExpression,
  getAllClassDerivedProperties,
  CORE_PURE_PATH,
  PropertyExplicitReference,
} from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import type { QueryBuilderPostFilterOperator } from '../QueryBuilderPostFilterOperator.js';
import {
  type PostFilterConditionState,
  type TDS_COLUMN_GETTER,
  getTDSColumnDerivedProperyFromType,
} from '../QueryBuilderPostFilterState.js';

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
  let tdsDerivedPropertyName: TDS_COLUMN_GETTER;
  const correspondingTDSDerivedProperty = operator.getTDSColumnGetter();
  if (correspondingTDSDerivedProperty) {
    tdsDerivedPropertyName = correspondingTDSDerivedProperty;
  } else {
    const type = guaranteeNonNullable(colState.getColumnType());
    tdsDerivedPropertyName = getTDSColumnDerivedProperyFromType(type);
  }
  tdsPropertyExpression.func = PropertyExplicitReference.create(
    guaranteeNonNullable(
      getAllClassDerivedProperties(graph.getClass(CORE_PURE_PATH.TDS_ROW)).find(
        (p) => p.name === tdsDerivedPropertyName,
      ),
    ),
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

  if (operatorFunctionFullPath) {
    const expression = new SimpleFunctionExpression(
      extractElementNameFromPath(operatorFunctionFullPath),
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
