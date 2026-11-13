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

import { test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  GenericType,
  GenericTypeExplicitReference,
  Multiplicity,
  PackageableElementExplicitReference,
  PrecisePrimitiveType,
  PrimitiveInstanceValue,
  PrimitiveType,
  RawVariableExpression,
} from '@finos/legend-graph';
import { rawVariableExpression_setType } from '../RawValueSpecificationGraphModifierHelper.js';

test(
  unitTest(
    'Changing the type of a function parameter clears its type variable values',
  ),
  () => {
    // code: Varchar(10)[1]
    const size = new PrimitiveInstanceValue(
      GenericTypeExplicitReference.create(
        new GenericType(PrimitiveType.INTEGER),
      ),
    );
    size.values = [10];
    const parameter = new RawVariableExpression(
      'code',
      Multiplicity.ONE,
      PackageableElementExplicitReference.create(PrecisePrimitiveType.VARCHAR),
      undefined,
      [size],
    );

    rawVariableExpression_setType(parameter, PrimitiveType.INTEGER);

    expect(parameter.type.value).toBe(PrimitiveType.INTEGER);
    expect(parameter.typeVariableValues).toBeUndefined();
  },
);
