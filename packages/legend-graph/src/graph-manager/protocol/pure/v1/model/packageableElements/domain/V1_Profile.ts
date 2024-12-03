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
import {
  type V1_PackageableElementVisitor,
  V1_PackageableElement,
} from '../../../model/packageableElements/V1_PackageableElement.js';

export class V1_ProfileStereotype {
  value!: string;

  constructor(value: string) {
    this.value = value;
  }
}

export class V1_ProfileTag {
  value!: string;
  constructor(value: string) {
    this.value = value;
  }
}

export class V1_Profile extends V1_PackageableElement implements Hashable {
  stereotypes: V1_ProfileStereotype[] = [];
  tags: V1_ProfileTag[] = [];

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.PROFILE,
      this.path,
      hashArray(this.stereotypes.map((e) => e.value)),
      hashArray(this.tags.map((e) => e.value)),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_Profile(this);
  }
}
