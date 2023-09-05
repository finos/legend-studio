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

import { type Hashable, hashArray } from '@finos/legend-shared';
import { MASTERY_HASH_STRUCTURE } from '../../../../../DSL_Mastery_HashUtils.js';
import type { DataProviderType } from './DSL_Mastery_DataProviderType.js';

export abstract class RuleScope implements Hashable {
  abstract get hashCode(): string;
}

export class RecordSourceScope extends RuleScope {
  recordSourceId!: string;

  override get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.RECORD_SOURCE_SCOPE,
      this.recordSourceId,
    ]);
  }
}

export class DataProviderIdScope extends RuleScope {
  dataProviderId!: string;

  override get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.DATA_PROVIDER_ID_SCOPE,
      this.dataProviderId,
    ]);
  }
}

export class DataProviderTypeScope extends RuleScope {
  dataProviderType!: DataProviderType;

  override get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.DATA_PROVIDER_TYPE_SCOPE,
      this.dataProviderType,
    ]);
  }
}
