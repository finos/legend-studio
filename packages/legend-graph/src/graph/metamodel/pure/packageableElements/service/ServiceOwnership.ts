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

import { hashArray, type Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../graph/Core_HashUtils.js';
import type { Service } from './Service.js';

export abstract class ServiceOwnership implements Hashable {
  abstract get hashCode(): string;
}

export class DeploymentOwnership extends ServiceOwnership implements Hashable {
  readonly _OWNER: Service;
  identifier: string;

  constructor(identifier: string, owner: Service) {
    super();
    this.identifier = identifier;
    this._OWNER = owner;
  }

  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.SERVICE_OWNER, this.identifier]);
  }
}

export class UserListOwnership extends ServiceOwnership implements Hashable {
  readonly _OWNER: Service;
  users: string[] = [];

  constructor(users: string[], owner: Service) {
    super();
    this.users = users;
    this._OWNER = owner;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_OWNER,
      hashArray(this.users),
    ]);
  }
}
