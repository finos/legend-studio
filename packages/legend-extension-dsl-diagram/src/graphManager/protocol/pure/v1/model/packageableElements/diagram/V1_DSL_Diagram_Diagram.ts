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
import type { V1_ClassView } from './V1_DSL_Diagram_ClassView.js';
import type { V1_PropertyView } from './V1_DSL_Diagram_PropertyView.js';
import type { V1_GeneralizationView } from './V1_DSL_Diagram_GeneralizationView.js';
import {
  type V1_PackageableElementVisitor,
  V1_PackageableElement,
} from '@finos/legend-graph';
import { DIAGRAM_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Diagram_HashUtils.js';

export class V1_Diagram extends V1_PackageableElement implements Hashable {
  classViews: V1_ClassView[] = [];
  propertyViews: V1_PropertyView[] = [];
  generalizationViews: V1_GeneralizationView[] = [];

  override get hashCode(): string {
    return hashArray([
      DIAGRAM_HASH_STRUCTURE.DIAGRAM,
      this.path,
      hashArray(this.classViews),
      // TODO: association views
      hashArray(this.generalizationViews),
      hashArray(this.propertyViews),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}
