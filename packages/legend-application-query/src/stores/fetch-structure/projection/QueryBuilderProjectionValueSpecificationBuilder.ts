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
  type LambdaFunction,
  CollectionInstanceValue,
  extractElementNameFromPath,
  GenericType,
  GenericTypeExplicitReference,
  matchFunctionName,
  Multiplicity,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
  SimpleFunctionExpression,
  TYPICAL_MULTIPLICITY_TYPE,
} from '@finos/legend-graph';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../QueryBuilder_Const.js';
import {
  COLUMN_SORT_TYPE,
  type QueryResultSetModifierState,
  type SortColumnState,
} from './QueryResultSetModifierState.js';

const buildSortExpression = (
  sortColumnState: SortColumnState,
): SimpleFunctionExpression => {
  const multiplicityOne =
    sortColumnState.columnState.projectionState.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
  const sortColumnFunction = new SimpleFunctionExpression(
    extractElementNameFromPath(
      sortColumnState.sortType === COLUMN_SORT_TYPE.ASC
        ? QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_ASC
        : QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_DESC,
    ),
    multiplicityOne,
  );
  const sortColumnName = new PrimitiveInstanceValue(
    GenericTypeExplicitReference.create(
      new GenericType(
        sortColumnState.columnState.projectionState.queryBuilderState.graphManagerState.graph.getPrimitiveType(
          PRIMITIVE_TYPE.STRING,
        ),
      ),
    ),
    multiplicityOne,
  );
  sortColumnName.values = [sortColumnState.columnState.columnName];
  sortColumnFunction.parametersValues[0] = sortColumnName;
  return sortColumnFunction;
};

export const appendResultSetModifiers = (
  resultModifiersState: QueryResultSetModifierState,
  lambda: LambdaFunction,
  options?:
    | {
        overridingLimit?: number | undefined;
      }
    | undefined,
): LambdaFunction => {
  const multiplicityOne =
    resultModifiersState.projectionState.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
  if (lambda.expressionSequence.length === 1) {
    const func = lambda.expressionSequence[0];
    if (func instanceof SimpleFunctionExpression) {
      if (
        matchFunctionName(
          func.functionName,
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_PROJECT,
        ) ||
        matchFunctionName(
          func.functionName,
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
        ) ||
        matchFunctionName(
          func.functionName,
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_FILTER,
        )
      ) {
        let currentExpression = func;

        // build distinct()
        if (resultModifiersState.distinct) {
          const distinctFunction = new SimpleFunctionExpression(
            extractElementNameFromPath(
              QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_DISTINCT,
            ),
            multiplicityOne,
          );
          distinctFunction.parametersValues[0] = currentExpression;
          currentExpression = distinctFunction;
        }

        // build sort()
        if (resultModifiersState.sortColumns.length) {
          const sortFunction = new SimpleFunctionExpression(
            extractElementNameFromPath(
              QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_SORT,
            ),
            multiplicityOne,
          );
          const multiplicity = new Multiplicity(
            resultModifiersState.sortColumns.length,
            resultModifiersState.sortColumns.length,
          );
          const collection = new CollectionInstanceValue(
            multiplicity,
            undefined,
          );
          collection.values =
            resultModifiersState.sortColumns.map(buildSortExpression);
          sortFunction.parametersValues[0] = currentExpression;
          sortFunction.parametersValues[1] = collection;
          currentExpression = sortFunction;
        }

        // build take()
        if (resultModifiersState.limit || options?.overridingLimit) {
          const limit = new PrimitiveInstanceValue(
            GenericTypeExplicitReference.create(
              new GenericType(
                resultModifiersState.projectionState.queryBuilderState.graphManagerState.graph.getPrimitiveType(
                  PRIMITIVE_TYPE.INTEGER,
                ),
              ),
            ),
            multiplicityOne,
          );
          limit.values = [
            Math.min(
              resultModifiersState.limit ?? Number.MAX_SAFE_INTEGER,
              options?.overridingLimit ?? Number.MAX_SAFE_INTEGER,
            ),
          ];
          const takeFunction = new SimpleFunctionExpression(
            extractElementNameFromPath(
              QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_TAKE,
            ),
            multiplicityOne,
          );

          takeFunction.parametersValues[0] = currentExpression;
          takeFunction.parametersValues[1] = limit;
          currentExpression = takeFunction;
        }

        lambda.expressionSequence[0] = currentExpression;
        return lambda;
      }
    }
  }
  return lambda;
};
