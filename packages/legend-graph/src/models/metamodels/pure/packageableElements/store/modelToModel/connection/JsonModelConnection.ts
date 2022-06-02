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
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst.js';
import type { ConnectionVisitor } from '../../../connection/Connection.js';
import type { Class } from '../../../domain/Class.js';
import type { ModelStore } from '../model/ModelStore.js';
import { PureModelConnection } from './PureModelConnection.js';
import type { PackageableElementReference } from '../../../PackageableElementReference.js';

export class JsonModelConnection
  extends PureModelConnection
  implements Hashable
{
  declare store: PackageableElementReference<ModelStore>;
  class: PackageableElementReference<Class>;
  url: string;

  constructor(
    store: PackageableElementReference<ModelStore>,
    _class: PackageableElementReference<Class>,
    url = createUrlStringFromData('{}', ContentType.APPLICATION_JSON, false),
  ) {
    super(store);
    this.class = _class;
    this.url = url;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.JSON_MODEL_CONNECTION,
      this.class.hashValue,
      this.url,
    ]);
  }

  accept_ConnectionVisitor<T>(visitor: ConnectionVisitor<T>): T {
    return visitor.visit_JsonModelConnection(this);
  }
}
