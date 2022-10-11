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
  type ValueSpecification,
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
} from '@finos/legend-graph';
import { addUniqueEntry, deleteEntry } from '@finos/legend-shared';
import { action } from 'mobx';

export const valueSpecification_setGenericType = action(
  (target: ValueSpecification, val: GenericTypeReference | undefined): void => {
    target.genericType = val ? observe_GenericTypeReference(val) : undefined;
  },
);

export const multiplicity_setLowerBound = action(
  (target: Multiplicity, val: number): void => {
    target.lowerBound = val;
  },
);

export const multiplicity_setUpperBound = action(
  (target: Multiplicity, val: number | undefined): void => {
    target.upperBound = val;
  },
);

export const simpleFunctionExpression_setFunc = action(
  (
    target: SimpleFunctionExpression,
    // eslint-disable-next-line @typescript-eslint/ban-types
    val: PackageableElementReference<Function> | undefined,
  ): void => {
    target.func = val ? observe_PackageableElementReference(val) : undefined;
  },
);

export const functionExpression_setParametersValues = action(
  (
    target: FunctionExpression,
    val: ValueSpecification[],
    context: ObserverContext,
  ): void => {
    target.parametersValues = val.map((v) =>
      observe_ValueSpecification(v, context),
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
    val: ValueSpecification[],
    observableContext: ObserverContext,
  ) => {
    target.values = val.map((v) =>
      observe_ValueSpecification(v, observableContext),
    );
  },
);

export const instanceValue_setValue = action(
  (target: InstanceValue, val: unknown, idx: number) => {
    target.values[idx] = val;
  },
);

export const instanceValue_setValues = action(
  (target: InstanceValue, val: unknown[]) => {
    // TODO?: do we have to observe the values here?
    // we might need to do so when we refactor collection value
    target.values = val;
  },
);

export const graphFetchTree_addSubTree = action(
  (target: GraphFetchTree, val: GraphFetchTree): void => {
    addUniqueEntry(target.subTrees, val);
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
    observableContext: ObserverContext,
  ) => {
    target.expressionSequence = val.map((v) =>
      observe_ValueSpecification(v, observableContext),
    );
  },
);

export const lambdaFunction_setExpression = action(
  (
    target: LambdaFunction,
    val: ValueSpecification,
    idx: number,
    observableContext: ObserverContext,
  ) => {
    target.expressionSequence[idx] = observe_ValueSpecification(
      val,
      observableContext,
    );
  },
);

export const functionType_setParameters = action(
  (target: FunctionType, val: VariableExpression[]) => {
    target.parameters = val.map((v) => observe_VariableExpression(v));
  },
);
