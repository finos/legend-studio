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

import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Persistence_HashUtils.js';
import { type Hashable, hashArray } from '@finos/legend-shared';

export abstract class V1_DeduplicationStrategy implements Hashable {
  abstract get hashCode(): string;
}

export class V1_NoDeduplicationStrategy
  extends V1_DeduplicationStrategy
  implements Hashable
{
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.NO_DEDUPLICATION_STRATEGY]);
  }
}

export class V1_AnyVersionDeduplicationStrategy
  extends V1_DeduplicationStrategy
  implements Hashable
{
  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.ANY_VERSION_DEDUPLICATION_STRATEGY,
    ]);
  }
}

export class V1_MaxVersionDeduplicationStrategy
  extends V1_DeduplicationStrategy
  implements Hashable
{
  versionField!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.MAX_VERSION_DEDUPLICATION_STRATEGY,
      this.versionField,
    ]);
  }
}

export class V1_DuplicateCountDeduplicationStrategy
  extends V1_DeduplicationStrategy
  implements Hashable
{
  duplicateCountName!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.DUPLICATE_COUNT_DEDUPLICATION_STRATEGY,
      this.duplicateCountName,
    ]);
  }
}
