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

import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../DSLPersistence_HashUtils.js';
import type {
  Binding,
  Database,
  PackageableElementReference,
} from '@finos/legend-graph';
import { type Hashable, hashArray } from '@finos/legend-shared';

export abstract class Sink implements Hashable {
  abstract get hashCode(): string;
}

export class RelationalSink extends Sink implements Hashable {
  database!: PackageableElementReference<Database>;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.RELATIONAL_SINK,
      this.database.valueForSerialization ?? '',
    ]);
  }
}

export class ObjectStorageSink extends Sink implements Hashable {
  binding!: PackageableElementReference<Binding>;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.OBJECT_STORAGE_SINK,
      this.binding.valueForSerialization ?? '',
    ]);
  }
}
