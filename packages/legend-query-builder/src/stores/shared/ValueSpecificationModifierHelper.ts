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
  type GenericType,
  type Type,
  type Multiplicity,
  type FunctionExpression,
  type ValueSpecification,
  type ObserverContext,
  type VariableExpression,
  type InstanceValue,
  type GraphFetchTree,
  type AbstractPropertyExpression,
  observe_ValueSpecification,
} from '@finos/legend-graph';
import { addUniqueEntry, deleteEntry } from '@finos/legend-shared';
import { action } from 'mobx';

export const genericType_setRawType = action(
  (genericType: GenericType, type: Type): void => {
    genericType.rawType = type;
  },
);

export const multiplicity_setLowerBound = action(
  (_m: Multiplicity, val: number): void => {
    _m.lowerBound = val;
  },
);
export const multiplicity_setUpperBound = action(
  (_m: Multiplicity, val: number | undefined): void => {
    _m.upperBound = val;
  },
);

export const functionExpression_setParametersValues = action(
  (
    functionExpression: FunctionExpression,
    val: ValueSpecification[],
    context: ObserverContext,
  ): void => {
    functionExpression.parametersValues = val.map((v) =>
      observe_ValueSpecification(v, context),
    );
  },
);

export const variableExpression_setName = action(
  (v: VariableExpression, val: string): void => {
    v.name = val;
  },
);

export const instanceValue_changeValue = action(
  (instanceValue: InstanceValue, val: unknown, idx: number) => {
    instanceValue.values[idx] = val;
  },
);

export const instanceValue_changeValues = action(
  (instanceValue: InstanceValue, val: unknown[]) => {
    instanceValue.values = val;
  },
);

export const graphFetchTree_addSubTree = action(
  (tree: GraphFetchTree, val: GraphFetchTree): void => {
    addUniqueEntry(tree.subTrees, val);
  },
);

export const graphFetchTree_removeSubTree = action(
  (tree: GraphFetchTree, val: GraphFetchTree): void => {
    deleteEntry(tree.subTrees, val);
  },
);

export const propertyExpression_setParametersValue = action(
  (
    propertyExpression: AbstractPropertyExpression,
    idx: number,
    val: ValueSpecification,
    context: ObserverContext,
  ): void => {
    propertyExpression.parametersValues[idx] = observe_ValueSpecification(
      val,
      context,
    );
  },
);

export const instanceValue_updateValues = action(
  (target: InstanceValue, values: unknown[]): void => {
    // TODO?: do we have to observe the values here?
    target.values = values;
  },
);
