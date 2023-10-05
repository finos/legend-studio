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
import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';

export abstract class V1_ServiceOwnership implements Hashable {
  abstract get hashCode(): string;
}

export class V1_DeploymentOwnership
  extends V1_ServiceOwnership
  implements Hashable
{
  identifier!: string;

  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.SERVICE_OWNER, this.identifier]);
  }
}

export class V1_UserListOwnership
  extends V1_ServiceOwnership
  implements Hashable
{
  users: string[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_OWNER,
      hashArray(this.users),
    ]);
  }
}
