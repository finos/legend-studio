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
import { CORE_HASH_STRUCTURE } from '../../../../../../../../../graph/Core_HashUtils.js';
import {
  type V1_ConnectionVisitor,
  V1_Connection,
} from '../../../../../model/packageableElements/connection/V1_Connection.js';

export class V1_JsonModelConnection extends V1_Connection implements Hashable {
  class!: string;
  url!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.JSON_MODEL_CONNECTION,
      this.class,
      this.url,
    ]);
  }

  accept_ConnectionVisitor<T>(visitor: V1_ConnectionVisitor<T>): T {
    return visitor.visit_JsonModelConnection(this);
  }
}
