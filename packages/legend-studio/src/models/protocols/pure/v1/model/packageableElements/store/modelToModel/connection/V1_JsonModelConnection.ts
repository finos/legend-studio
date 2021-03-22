/**
 * Copyright Goldman Sachs
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

import { hashArray } from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../../MetaModelConst';
import type { V1_ConnectionVisitor } from '../../../../../model/packageableElements/connection/V1_Connection';
import { V1_Connection } from '../../../../../model/packageableElements/connection/V1_Connection';

export class V1_JsonModelConnection extends V1_Connection implements Hashable {
  class!: string;
  url!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.JSON_MODEL_CONNECTION,
      super.hashCode,
      this.class,
      this.url,
    ]);
  }

  accept_ConnectionVisitor<T>(visitor: V1_ConnectionVisitor<T>): T {
    return visitor.visit_JsonModelConnection(this);
  }
}
