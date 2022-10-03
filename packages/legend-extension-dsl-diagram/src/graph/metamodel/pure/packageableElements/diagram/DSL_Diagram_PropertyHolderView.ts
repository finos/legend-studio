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
import { RelationshipView } from './DSL_Diagram_RelationshipView.js';
import type { ClassView } from './DSL_Diagram_ClassView.js';
import type { Diagram } from './DSL_Diagram_Diagram.js';
import type { PropertyReference } from '@finos/legend-graph';
import { DIAGRAM_HASH_STRUCTURE } from '../../../../DSL_Diagram_HashUtils.js';

export class PropertyHolderView extends RelationshipView implements Hashable {
  property: PropertyReference;

  constructor(
    owner: Diagram,
    property: PropertyReference,
    from: ClassView,
    to: ClassView,
  ) {
    super(owner, from, to);
    this.property = property;
  }

  override get hashCode(): string {
    return hashArray([
      DIAGRAM_HASH_STRUCTURE.PROPERTY_HOLDER_VIEW,
      super.hashCode,
      this.property.pointerHashCode,
    ]);
  }
}
