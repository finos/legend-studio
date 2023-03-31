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

import { hashArray, type Hashable } from '@finos/legend-shared';
import { Multiplicity } from '../packageableElements/domain/Multiplicity.js';
import { InstanceValue } from './InstanceValue.js';
import type {
  ValueSpecification,
  ValueSpecificationVisitor,
} from './ValueSpecification.js';
import { CORE_HASH_STRUCTURE } from '../../../Core_HashUtils.js';

export class KeyExpression implements Hashable {
  add: boolean | undefined;
  key: InstanceValue;
  expression: ValueSpecification;

  constructor(
    key: InstanceValue,
    expression: ValueSpecification,
    add: boolean | undefined,
  ) {
    this.add = add;
    this.key = key;
    this.expression = expression;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.KEY_EXPRESSION_VALUE,
      this.add ?? '',
      this.key,
      this.expression,
    ]);
  }
}

export class KeyExpressionInstanceValue
  extends InstanceValue
  implements Hashable
{
  override values: KeyExpression[] = [];

  constructor() {
    super(Multiplicity.ONE, undefined);
  }

  override accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_KeyExpressionInstanceValue(this);
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.KEY_EXPRESSION_INSTANCE_VALUE,
      this.multiplicity,
      hashArray(this.values),
    ]);
  }
}
