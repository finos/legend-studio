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

import { hashArray } from '@finos/legend-shared';
import type { Hashable } from '@finos/legend-shared';
import type { V1_PackageableElementVisitor } from '@finos/legend-graph';
import { V1_Store } from '@finos/legend-graph';
import { EXTERNAL_SHARED_FORMAT_HASH_STRUCTURE } from '../../../../../../DSLSerializer_ModelUtils';
import type { V1_ModelUnit } from './V1_ModelUnit';

export class V1_Binding extends V1_Store implements Hashable {
  schemaSet?: string | undefined;
  schemaId?: string | undefined;
  contentType = '';
  modelUnit!: V1_ModelUnit;

  override get hashCode(): string {
    return hashArray([
      EXTERNAL_SHARED_FORMAT_HASH_STRUCTURE.BINDING,
      this.path,
      this.schemaSet ?? '',
      this.schemaId ?? '',
      this.contentType,
      this.modelUnit,
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}
