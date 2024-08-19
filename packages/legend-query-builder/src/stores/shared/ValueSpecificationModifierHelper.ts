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
  ValueSpecification,
  type ObserverContext,
  type VariableExpression,
  type InstanceValue,
  type GraphFetchTree,
  type AbstractPropertyExpression,
  type GenericTypeReference,
  type SimpleFunctionExpression,
  type PackageableElementReference,
  type Function,
  type LambdaFunction,
  type FunctionType,
  type CollectionInstanceValue,
  type PropertyReference,
  observe_ValueSpecification,
  observe_GenericTypeReference,
  observe_PackageableElementReference,
  observe_VariableExpression,
  observe_GraphFetchTree,
} from '@finos/legend-graph';
import { addUniqueEntry, deleteEntry } from '@finos/legend-shared';
import { action } from 'mobx';

export const valueSpecification_setGenericType = action(
  (target: ValueSpecification, val: GenericTypeReference | undefined): void => {
    target.genericType = val ? observe_GenericTypeReference(val) : undefined;
  },
);

export const valueSpecification_setMultiplicity = action(
  (target: ValueSpecification, val: Multiplicity): void => {
    target.multiplicity = val;
  },
);

export const simpleFunctionExpression_setFunc = action(
  (
    target: SimpleFunctionExpression,
    val: PackageableElementReference<Function> | undefined,
  ): void => {
    target.func = val ? observe_PackageableElementReference(val) : undefined;
  },
);

export const functionExpression_setParametersValues = action(
  (
    target: FunctionExpression,
    values: ValueSpecification[],
    context: ObserverContext,
  ): void => {
    target.parametersValues = values.map((val) =>
      observe_ValueSpecification(val, context),
    );
  },
);

export const functionExpression_setParameterValue = action(
  (
    target: FunctionExpression,
    val: ValueSpecification,
    idx: number,
    context: ObserverContext,
  ): void => {
    target.parametersValues[idx] = observe_ValueSpecification(val, context);
  },
);

export const functionExpression_addParameterValue = action(
  (
    target: FunctionExpression,
    val: ValueSpecification,
    context: ObserverContext,
  ): void => {
    target.parametersValues.push(observe_ValueSpecification(val, context));
  },
);

export const propertyExpression_setFunc = action(
  (target: AbstractPropertyExpression, val: PropertyReference): void => {
    target.func = val;
  },
);

export const variableExpression_setName = action(
  (target: VariableExpression, val: string): void => {
    target.name = val;
  },
);

export const collectionInstanceValue_setValues = action(
  (
    target: CollectionInstanceValue,
    values: ValueSpecification[],
    observerContext: ObserverContext,
  ) => {
    target.values = values.map((val) =>
      observe_ValueSpecification(val, observerContext),
    );
  },
);

export const instanceValue_setValue = action(
  (
    target: InstanceValue,
    val: unknown,
    idx: number,
    observerContext: ObserverContext,
  ) => {
    target.values[idx] =
      val instanceof ValueSpecification
        ? observe_ValueSpecification(val, observerContext)
        : val;
  },
);

export const instanceValue_setValues = action(
  (
    target: InstanceValue,
    values: unknown[],
    observerContext: ObserverContext,
  ) => {
    target.values = values.map((val) =>
      val instanceof ValueSpecification
        ? observe_ValueSpecification(val, observerContext)
        : val,
    );
  },
);

export const graphFetchTree_addSubTree = action(
  (
    target: GraphFetchTree,
    val: GraphFetchTree,
    observerContext: ObserverContext,
  ): void => {
    addUniqueEntry(
      target.subTrees,
      observe_GraphFetchTree(val, observerContext),
    );
  },
);

export const graphFetchTree_removeSubTree = action(
  (target: GraphFetchTree, val: GraphFetchTree): void => {
    deleteEntry(target.subTrees, val);
  },
);

export const lambdaFunction_setExpressionSequence = action(
  (
    target: LambdaFunction,
    val: ValueSpecification[],
    observerContext: ObserverContext,
  ) => {
    target.expressionSequence = val.map((v) =>
      observe_ValueSpecification(v, observerContext),
    );
  },
);

export const lambdaFunction_setExpression = action(
  (
    target: LambdaFunction,
    val: ValueSpecification,
    idx: number,
    observerContext: ObserverContext,
  ) => {
    target.expressionSequence[idx] = observe_ValueSpecification(
      val,
      observerContext,
    );
  },
);

export const functionType_setParameters = action(
  (target: FunctionType, val: VariableExpression[]) => {
    target.parameters = val.map((v) => observe_VariableExpression(v));
  },
);
