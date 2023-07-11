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
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Persistence_HashUtils.js';
import type { V1_UpdatesHandling } from './V1_DSL_Persistence_UpdatesHandling.js';
import type { V1_ProcessingDimension } from './V1_DSL_Persistence_ProcessingDimension.js';
import type { V1_SourceDerivedDimension } from './V1_DSL_Persistence_SourceDerivedDimension.js';
import type { V1_AuditingV2 } from './V1_DSL_Persistence_AuditingV2.js';

export abstract class V1_Temporality implements Hashable {
  abstract get hashCode(): string;
}

export class V1_NonTemporal extends V1_Temporality {
  auditing!: V1_AuditingV2;
  updatesHandling!: V1_UpdatesHandling;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.NON_TEMPORAL,
      this.auditing,
      this.updatesHandling,
    ]);
  }
}

export class V1_UniTemporal extends V1_Temporality {
  processingDimension!: V1_ProcessingDimension;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.UNI_TEMPORAL,
      this.processingDimension,
    ]);
  }
}

export class V1_BiTemporal extends V1_Temporality {
  processingDimension!: V1_ProcessingDimension;
  sourceDerivedDimension!: V1_SourceDerivedDimension;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.UNI_TEMPORAL,
      this.processingDimension,
      this.sourceDerivedDimension,
    ]);
  }
}
