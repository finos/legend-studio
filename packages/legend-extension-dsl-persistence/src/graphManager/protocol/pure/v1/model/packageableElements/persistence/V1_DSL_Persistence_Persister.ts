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

import type { V1_IngestMode } from './V1_DSL_Persistence_IngestMode.js';
import type { V1_Sink } from './V1_DSL_Persistence_Sink.js';
import type { V1_TargetShape } from './V1_DSL_Persistence_TargetShape.js';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Persistence_HashUtils.js';
import { type Hashable, hashArray } from '@finos/legend-shared';

export abstract class V1_Persister implements Hashable {
  abstract get hashCode(): string;
}

export class V1_StreamingPersister extends V1_Persister implements Hashable {
  sink!: V1_Sink;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.STREAMING_PERSISTER,
      this.sink,
    ]);
  }
}

export class V1_BatchPersister extends V1_Persister implements Hashable {
  sink!: V1_Sink;
  ingestMode!: V1_IngestMode;
  targetShape!: V1_TargetShape;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BATCH_PERSISTER,
      this.sink,
      this.ingestMode,
      this.targetShape,
    ]);
  }
}
