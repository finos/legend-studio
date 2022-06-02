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
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst.js';
import type {
  RelationalDataTableColumn,
  RelationalDataTableRow,
} from '../../data/RelationalData.js';
import { type TestAssertionVisitor, TestAssertion } from './TestAssertion.js';

export class RelationalTDS implements Hashable {
  columns: RelationalDataTableColumn[] = [];
  rows: RelationalDataTableRow[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_TDS,
      hashArray(this.columns),
      hashArray(this.rows),
    ]);
  }
}

export class EqualToTDS extends TestAssertion {
  expected!: RelationalTDS;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.EQUAL_TO_TDS,
      this.id,
      this.expected,
    ]);
  }

  accept_TestAssertionVisitor<T>(visitor: TestAssertionVisitor<T>): T {
    return visitor.visit_EqualToTDS(this);
  }
}
