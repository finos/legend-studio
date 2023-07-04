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
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../DSL_Persistence_HashUtils.js';

export abstract class SourceTimeFields implements Hashable {
  abstract get hashCode(): string;
}

export class SourceTimeStart extends SourceTimeFields {
  startField!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.SOURCE_TIME_START,
      this.startField,
    ]);
  }
}

export class SourceTimeStartAndEnd extends SourceTimeFields {
  startField!: string;
  endField!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.SOURCE_TIME_START_AND_END,
      this.startField,
      this.endField,
    ]);
  }
}
