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

import {
  type Hashable,
  hashArray,
  ContentType,
  createUrlStringFromData,
} from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import {
  type ConnectionVisitor,
  Connection,
} from '../../../connection/Connection.js';
import type { PackageableElementReference } from '../../../PackageableElementReference.js';
import type { FlatData } from '../model/FlatData.js';

export class FlatDataConnection extends Connection implements Hashable {
  declare store: PackageableElementReference<FlatData>;
  url: string;

  constructor(
    store: PackageableElementReference<FlatData>,
    url = createUrlStringFromData('', ContentType.TEXT_PLAIN, false),
  ) {
    super(store);
    this.url = url;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_CONNECTION,
      this.store.valueForSerialization ?? '',
      this.url,
    ]);
  }

  accept_ConnectionVisitor<T>(visitor: ConnectionVisitor<T>): T {
    return visitor.visit_FlatDataConnection(this);
  }
}
