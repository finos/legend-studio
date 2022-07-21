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

import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../../DSLPersistence_ModelUtils.js';
import type { V1_Connection } from '@finos/legend-graph';
import { type Hashable, hashArray } from '@finos/legend-shared';

export abstract class V1_Sink implements Hashable {
  abstract get hashCode(): string;
}

export class V1_RelationalSink extends V1_Sink implements Hashable {
  //TODO: ledav -- make required once persistence changes are rolled out in engine
  database?: string;
  //TODO: ledav -- remove once persistence changes are rolled out in engine
  connection?: V1_Connection;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.RELATIONAL_SINK,
      this.database ?? '',
      this.connection ?? '',
    ]);
  }
}

export class V1_ObjectStorageSink extends V1_Sink implements Hashable {
  binding!: string;
  //TODO: ledav -- remove once persistence changes are rolled out in engine
  connection?: V1_Connection;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.OBJECT_STORAGE_SINK,
      this.binding,
      this.connection ?? '',
    ]);
  }
}
