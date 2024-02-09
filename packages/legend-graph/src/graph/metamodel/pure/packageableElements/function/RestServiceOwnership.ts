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
import type { RestService } from './RestService.js';

export abstract class RestServiceOwnership implements Hashable {
  abstract get hashCode(): string;
}

export class RestDeploymentOwnership
  extends RestServiceOwnership
  implements Hashable
{
  readonly _OWNER: RestService;
  id: string;

  constructor(id: string, owner: RestService) {
    super();
    this.id = id;
    this._OWNER = owner;
  }

  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.REST_SERVICE_OWNER, this.id]);
  }
}

export class RestUserListOwnership
  extends RestServiceOwnership
  implements Hashable
{
  readonly _OWNER: RestService;
  users: string[] = [];

  constructor(users: string[], owner: RestService) {
    super();
    this.users = users;
    this._OWNER = owner;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.REST_SERVICE_OWNER,
      hashArray(this.users),
    ]);
  }
}
