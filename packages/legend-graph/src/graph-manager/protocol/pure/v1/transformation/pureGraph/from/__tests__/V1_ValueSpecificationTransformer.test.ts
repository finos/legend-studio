/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { test, describe, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import { V1_transformRootValueSpecification } from '../V1_ValueSpecificationTransformer.js';
import {
  ColSpec,
  ColSpecInstanceValue,
} from '../../../../../../../../graph/metamodel/pure/valueSpecification/RelationValueSpecification.js';
import {
  FunctionType,
  LambdaFunction,
  LambdaFunctionInstanceValue,
} from '../../../../../../../../graph/metamodel/pure/valueSpecification/LambdaFunction.js';
import { VariableExpression } from '../../../../../../../../graph/metamodel/pure/valueSpecification/VariableExpression.js';
import { SimpleFunctionExpression } from '../../../../../../../../graph/metamodel/pure/valueSpecification/Expression.js';
import type { ValueSpecification } from '../../../../../../../../graph/metamodel/pure/valueSpecification/ValueSpecification.js';
import { Multiplicity } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/Multiplicity.js';
import { V1_ClassInstance } from '../../../../model/valueSpecification/raw/V1_ClassInstance.js';
import { V1_ColSpec } from '../../../../model/valueSpecification/raw/classInstance/relation/V1_ColSpec.js';
import { V1_Lambda } from '../../../../model/valueSpecification/raw/V1_Lambda.js';
import { V1_AppliedFunction } from '../../../../model/valueSpecification/application/V1_AppliedFunction.js';
import { V1_Variable } from '../../../../model/valueSpecification/V1_Variable.js';

const buildLambda = (
  parameterName: string,
  body: ValueSpecification,
): LambdaFunctionInstanceValue => {
  const lambda = new LambdaFunction(
    new FunctionType(undefined, Multiplicity.ONE),
  );
  lambda.functionType.parameters = [
    new VariableExpression(parameterName, Multiplicity.ONE),
  ];
  lambda.expressionSequence = [body];
  const instanceValue = new LambdaFunctionInstanceValue();
  instanceValue.values = [lambda];
  return instanceValue;
};

const transformSingleColSpec = (colSpec: ColSpec): V1_ColSpec => {
  const instanceValue = new ColSpecInstanceValue(Multiplicity.ONE);
  instanceValue.values = [colSpec];
  return guaranteeType(
    guaranteeType(
      V1_transformRootValueSpecification(instanceValue),
      V1_ClassInstance,
    ).value,
    V1_ColSpec,
  );
};

const getLambdaBody = (lambda: unknown): unknown =>
  guaranteeNonNullable(guaranteeType(lambda, V1_Lambda).body[0]);

describe(unitTest('Single ColSpec transformation'), () => {
  test('keeps function1 (map) and function2 (reduce) apart', () => {
    // ~cnt:x|$x:y|$y->count()
    const colSpec = new ColSpec();
    colSpec.name = 'cnt';
    colSpec.function1 = buildLambda(
      'x',
      new VariableExpression('x', Multiplicity.ONE),
    );
    const count = new SimpleFunctionExpression('count');
    count.parametersValues = [new VariableExpression('y', Multiplicity.ONE)];
    colSpec.function2 = buildLambda('y', count);

    const v1ColSpec = transformSingleColSpec(colSpec);

    expect(v1ColSpec.name).toBe('cnt');
    expect(
      guaranteeType(getLambdaBody(v1ColSpec.function1), V1_Variable).name,
    ).toBe('x');
    expect(
      guaranteeType(getLambdaBody(v1ColSpec.function2), V1_AppliedFunction)
        .function,
    ).toBe('count');
  });

  test('transforms a ColSpec with only function1', () => {
    const colSpec = new ColSpec();
    colSpec.name = 'a';
    colSpec.function1 = buildLambda(
      'x',
      new VariableExpression('x', Multiplicity.ONE),
    );

    const v1ColSpec = transformSingleColSpec(colSpec);

    expect(
      guaranteeType(getLambdaBody(v1ColSpec.function1), V1_Variable).name,
    ).toBe('x');
    expect(v1ColSpec.function2).toBeUndefined();
  });
});
