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

import { UnsupportedOperationError } from '@finos/legend-shared';
import { Store } from '../../Store.js';
import type { PackageableElementVisitor } from '../../../PackageableElement.js';

/**
 * NOTE: Since this is a dummy store used for model connections, we can have this
 * as a singleton.
 */
export class ModelStore extends Store {
  static readonly NAME = 'ModelStore';
  static readonly INSTANCE = new ModelStore();

  private constructor() {
    super(ModelStore.NAME);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    throw new UnsupportedOperationError();
  }
}
