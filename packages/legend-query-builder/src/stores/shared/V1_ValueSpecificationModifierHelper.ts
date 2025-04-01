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
  type V1_AppliedProperty,
  type V1_CByteArray,
  type V1_CDateTime,
  type V1_Collection,
  type V1_CStrictDate,
  type V1_CStrictTime,
  type V1_CString,
  type V1_ValueSpecification,
  V1_CBoolean,
  V1_CDecimal,
  V1_CFloat,
  V1_CInteger,
} from '@finos/legend-graph';
import {
  guaranteeIsBoolean,
  guaranteeIsNumber,
  guaranteeIsString,
} from '@finos/legend-shared';
import { action } from 'mobx';

export const V1_PrimitiveValue_setValue = action(
  (
    target:
      | V1_CBoolean
      | V1_CByteArray
      | V1_CDateTime
      | V1_CDecimal
      | V1_CFloat
      | V1_CInteger
      | V1_CStrictDate
      | V1_CStrictTime
      | V1_CString,
    val: unknown,
  ) => {
    if (target instanceof V1_CBoolean) {
      target.value = guaranteeIsBoolean(val);
    } else if (
      target instanceof V1_CDecimal ||
      target instanceof V1_CFloat ||
      target instanceof V1_CInteger
    ) {
      target.value = guaranteeIsNumber(val);
    } else {
      target.value = guaranteeIsString(val);
    }
  },
);

export const V1_AppliedProperty_setProperty = action(
  (target: V1_AppliedProperty, val: string) => {
    target.property = val;
  },
);

export const V1_Collection_setValues = action(
  (target: V1_Collection, val: V1_ValueSpecification[]) => {
    target.values = val;
  },
);
