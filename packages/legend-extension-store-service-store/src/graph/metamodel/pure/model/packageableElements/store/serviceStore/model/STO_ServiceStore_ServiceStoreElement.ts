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

import type { Hashable } from '@finos/legend-shared';
import type { ServiceStore } from './STO_ServiceStore_ServiceStore.js';
import type { ServiceGroup } from './STO_ServiceStore_ServiceGroup.js';

export abstract class ServiceStoreElement implements Hashable {
  owner!: ServiceStore;
  parent?: ServiceGroup | undefined;
  id!: string;
  path!: string;

  abstract get hashCode(): string;
}
