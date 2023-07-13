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

import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../DSL_Persistence_HashUtils.js';
import { type Hashable, hashArray } from '@finos/legend-shared';
import type { PersistenceTarget } from './DSL_Persistence_PersistentTarget.js';
import type { ServiceOutput } from './DSL_Persistence_ServiceOutput.js';

export class ServiceOutputTarget implements Hashable {
  serviceOutput!: ServiceOutput;
  persistenceTarget!: PersistenceTarget;
  get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.SERVICE_OUTPUT_TARGET,
      this.serviceOutput,
      this.persistenceTarget,
    ]);
  }
}
