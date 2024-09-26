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
  V1_AppliedFunction,
  V1_ClassInstance,
  V1_ColSpec,
  V1_ColSpecArray,
  V1_Lambda,
  extractElementNameFromPath as _name,
  matchFunctionName,
  type V1_ValueSpecification,
} from '@finos/legend-graph';
import { type DataCubeQuerySnapshotColumn } from './DataCubeQuerySnapshot.js';
import {
  assertTrue,
  assertType,
  guaranteeType,
  UnsupportedOperationError,
  type Clazz,
} from '@finos/legend-shared';
import {
  DataCubeFunction,
  DataCubeAggregateOperator,
} from './DataCubeQueryEngine.js';

// --------------------------------- UTILITIES ---------------------------------

export function _param<T extends V1_ValueSpecification>(
  func: V1_AppliedFunction,
  paramIdx: number,
  clazz: Clazz<T>,
): T {
  assertTrue(
    func.parameters.length >= paramIdx + 1,
    `Can't process ${_name(func.function)}: Expected at least ${paramIdx + 1} parameter(s)`,
  );
  return guaranteeType(
    func.parameters[paramIdx],
    clazz,
    `Can't process ${_name(func.function)}: Found unexpected type for parameter at index ${paramIdx}`,
  );
}

export function _colSpecParam(func: V1_AppliedFunction, paramIdx: number) {
  return guaranteeType(
    _param(func, paramIdx, V1_ClassInstance).value,
    V1_ColSpec,
    `Can't process ${_name(func.function)}: Expected parameter at index ${paramIdx} to be a column specification`,
  );
}

export function _colSpecArrayParam(func: V1_AppliedFunction, paramIdx: number) {
  return guaranteeType(
    _param(func, paramIdx, V1_ClassInstance).value,
    V1_ColSpecArray,
    `Can't process ${_name(func.function)}: Expected parameter at index ${paramIdx} to be a column specification list`,
  );
}

export function _funcMatch(
  value: V1_ValueSpecification | undefined,
  functionNames: string | string[],
) {
  assertType(
    value,
    V1_AppliedFunction,
    `Can't process function: Found unexpected value specification type`,
  );
  assertTrue(
    matchFunctionName(
      value.function,
      Array.isArray(functionNames) ? functionNames : [functionNames],
    ),
    `Can't process function: Expected function name to be one of [${Array.isArray(functionNames) ? functionNames.join(', ') : functionNames}]`,
  );
  return value;
}

// TODO: move these functions out into aggregator utils when we make agg operator handling systematic
// similar to what we did with filter
function _aggFuncMatch(
  value: V1_ValueSpecification | undefined,
  functionNames: string | string[],
) {
  assertType(
    value,
    V1_Lambda,
    `Can't process aggregation: Found unexpected value specification type`,
  );
  return _funcMatch(value.body[0], functionNames);
}

export function _aggCol(
  colSpec: V1_ColSpec,
  column: DataCubeQuerySnapshotColumn,
) {
  const func = _aggFuncMatch(
    colSpec.function2,
    Object.values(DataCubeFunction),
  );
  if (matchFunctionName(func.function, DataCubeFunction.COUNT)) {
    return {
      ...column,
      operation: DataCubeAggregateOperator.COUNT,
      parameters: [],
    };
  } else if (matchFunctionName(func.function, DataCubeFunction.SUM)) {
    return {
      ...column,
      operation: DataCubeAggregateOperator.SUM,
      parameters: [],
    };
  } else if (matchFunctionName(func.function, DataCubeFunction.AVERAGE)) {
    return {
      ...column,
      operation: DataCubeAggregateOperator.AVERAGE,
      parameters: [],
    };
  } else if (matchFunctionName(func.function, DataCubeFunction.MIN)) {
    return {
      ...column,
      operation: DataCubeAggregateOperator.MIN,
      parameters: [],
    };
  } else if (matchFunctionName(func.function, DataCubeFunction.MAX)) {
    return {
      ...column,
      operation: DataCubeAggregateOperator.MAX,
      parameters: [],
    };
  } else if (matchFunctionName(func.function, DataCubeFunction.FIRST)) {
    return {
      ...column,
      operation: DataCubeAggregateOperator.FIRST,
      parameters: [],
    };
  } else if (matchFunctionName(func.function, DataCubeFunction.LAST)) {
    return {
      ...column,
      operation: DataCubeAggregateOperator.LAST,
      parameters: [],
    };
  } else if (
    matchFunctionName(func.function, DataCubeFunction.VARIANCE_POPULATION)
  ) {
    return {
      ...column,
      operation: DataCubeAggregateOperator.VARIANCE_POPULATION,
      parameters: [],
    };
  } else if (
    matchFunctionName(func.function, DataCubeFunction.VARIANCE_SAMPLE)
  ) {
    return {
      ...column,
      operation: DataCubeAggregateOperator.VARIANCE_SAMPLE,
      parameters: [],
    };
  } else if (
    matchFunctionName(
      func.function,
      DataCubeFunction.STANDARD_DEVIATION_POPULATION,
    )
  ) {
    return {
      ...column,
      operation: DataCubeAggregateOperator.STANDARD_DEVIATION_POPULATION,
      parameters: [],
    };
  } else if (
    matchFunctionName(func.function, DataCubeFunction.STANDARD_DEVIATION_SAMPLE)
  ) {
    return {
      ...column,
      operation: DataCubeAggregateOperator.STANDARD_DEVIATION_SAMPLE,
      parameters: [],
    };
  } else {
    throw new UnsupportedOperationError(
      `Unsupported aggregate function '${func.function}'`,
    );
  }
}
