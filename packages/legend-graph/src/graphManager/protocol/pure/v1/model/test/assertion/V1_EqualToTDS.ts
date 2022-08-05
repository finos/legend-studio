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

import { hashArray } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import type { V1_ExternalFormatData } from '../../data/V1_EmbeddedData.js';
import {
  type V1_TestAssertionVisitor,
  V1_TestAssertion,
} from './V1_TestAssertion.js';

export class V1_EqualToTDS extends V1_TestAssertion {
  expected!: V1_ExternalFormatData;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.EQUAL_TO_TDS,
      this.id,
      this.expected,
    ]);
  }

  accept_TestAssertionVisitor<T>(visitor: V1_TestAssertionVisitor<T>): T {
    return visitor.visit_EqualToTDS(this);
  }
}
