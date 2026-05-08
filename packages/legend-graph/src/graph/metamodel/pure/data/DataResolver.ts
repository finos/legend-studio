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
import type { PackageableElementReference } from '../packageableElements/PackageableElementReference.js';
import type { EmbeddedData } from './EmbeddedData.js';
import { CORE_HASH_STRUCTURE } from '../../../Core_HashUtils.js';
import type { PackageableElement } from '../packageableElements/PackageableElement.js';

export abstract class DataResolver implements Hashable {
  abstract get hashCode(): string;
}

export class BaseDataResolver extends DataResolver implements Hashable {
  data!: EmbeddedData;
  element!: PackageableElementReference<PackageableElement>;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.BASE_DATA_RESOLVER,
      this.data,
      this.element.valueForSerialization ?? '',
    ]);
  }
}

export class ReferenceDataResolver extends DataResolver implements Hashable {
  element!: PackageableElementReference<PackageableElement>;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.REFERENCE_DATA_RESOLVER,
      this.element.valueForSerialization ?? '',
    ]);
  }
}
