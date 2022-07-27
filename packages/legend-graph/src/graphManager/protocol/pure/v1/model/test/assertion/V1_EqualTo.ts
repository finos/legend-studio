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
import {
  CORE_HASH_STRUCTURE,
  hashObjectWithoutSourceInformation,
} from '../../../../../../../graph/Core_HashUtils.js';
import {
  V1_TestAssertion,
  type V1_TestAssertionVisitor,
} from './V1_TestAssertion.js';

export class V1_EqualTo extends V1_TestAssertion implements Hashable {
  expected!: object;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.EQUAL_TO,
      this.id,
      hashObjectWithoutSourceInformation(this.expected),
    ]);
  }

  accept_TestAssertionVisitor<T>(visitor: V1_TestAssertionVisitor<T>): T {
    return visitor.visit_EqualTo(this);
  }
}
