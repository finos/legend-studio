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

import { LambdaFunctionInstanceValue } from '../metamodel/pure/valueSpecification/LambdaFunction.js';
import type { ValueSpecification } from '../metamodel/pure/valueSpecification/ValueSpecification.js';
import type { Type } from '../metamodel/pure/packageableElements/domain/Type.js';

export const getValueSpecificationReturnType = (
  val: ValueSpecification,
): Type | undefined => {
  if (val instanceof LambdaFunctionInstanceValue) {
    const lastExpression = val.values[0]?.expressionSequence[0];
    return lastExpression?.genericType?.value.rawType;
  }
  return undefined;
};
