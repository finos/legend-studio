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

import type { V1_Variable } from './V1_Variable.js';
import type { V1_Lambda } from './raw/V1_Lambda.js';
import type { V1_EnumValue } from './raw/V1_EnumValue.js';
import type { V1_AppliedFunction } from './application/V1_AppliedFunction.js';
import type { V1_Collection } from './raw/V1_Collection.js';
import type { V1_CDecimal } from './raw/V1_CDecimal.js';
import type { V1_CInteger } from './raw/V1_CInteger.js';
import type { V1_CString } from './raw/V1_CString.js';
import type { V1_CFloat } from './raw/V1_CFloat.js';
import type { V1_CDateTime } from './raw/V1_CDateTime.js';
import type { V1_CStrictTime } from './raw/V1_CStrictTime.js';
import type { V1_CStrictDate } from './raw/V1_CStrictDate.js';
import type { V1_CLatestDate } from './raw/V1_CLatestDate.js';
import type { V1_CBoolean } from './raw/V1_CBoolean.js';
import type { V1_KeyExpression } from './raw/V1_KeyExpression.js';
import type { V1_AppliedProperty } from './application/V1_AppliedProperty.js';
import type { V1_PackageableElementPtr } from './raw/V1_PackageableElementPtr.js';
import type { V1_INTERNAL__UnknownValueSpecification } from './V1_INTERNAL__UnknownValueSpecfication.js';
import type { V1_GenericTypeInstance } from './raw/V1_GenericTypeInstance.js';
import type { V1_ClassInstance } from './raw/V1_ClassInstance.js';
import type { V1_CByteArray } from './raw/V1_CByteArray.js';
import { hashArray, type Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../graph/Core_HashUtils.js';

export interface V1_ValueSpecificationVisitor<T> {
  visit_INTERNAL__UnknownValueSpecfication(
    valueSpecification: V1_INTERNAL__UnknownValueSpecification,
  ): T;

  visit_Variable(valueSpecification: V1_Variable): T;
  visit_Lambda(valueSpecification: V1_Lambda): T;
  visit_KeyExpression(valueSpecification: V1_KeyExpression): T;

  visit_AppliedFunction(valueSpecification: V1_AppliedFunction): T;
  visit_AppliedProperty(valueSpecification: V1_AppliedProperty): T;

  visit_PackageableElementPtr(valueSpecification: V1_PackageableElementPtr): T;
  visit_GenericTypeInstance(valueSpecification: V1_GenericTypeInstance): T;

  visit_Collection(valueSpecification: V1_Collection): T;
  visit_EnumValue(valueSpecification: V1_EnumValue): T;
  visit_CInteger(valueSpecification: V1_CInteger): T;
  visit_CDecimal(valueSpecification: V1_CDecimal): T;
  visit_CString(valueSpecification: V1_CString): T;
  visit_CBoolean(valueSpecification: V1_CBoolean): T;
  visit_CByteArray(valueSpecification: V1_CByteArray): T;
  visit_CFloat(valueSpecification: V1_CFloat): T;
  visit_CDateTime(valueSpecification: V1_CDateTime): T;
  visit_CStrictDate(valueSpecification: V1_CStrictDate): T;
  visit_CStrictTime(valueSpecification: V1_CStrictTime): T;
  visit_CLatestDate(valueSpecification: V1_CLatestDate): T;

  visit_ClassInstance(valueSpecification: V1_ClassInstance): T;
}

export abstract class V1_ValueSpecification implements Hashable {
  abstract accept_ValueSpecificationVisitor<T>(
    visitor: V1_ValueSpecificationVisitor<T>,
  ): T;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.INTERNAL__UNKNOWN_VALUE_SPECIFICATION,
    ]);
  }
}
