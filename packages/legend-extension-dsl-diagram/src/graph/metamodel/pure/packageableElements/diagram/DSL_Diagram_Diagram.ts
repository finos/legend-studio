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
import type { ClassView } from './DSL_Diagram_ClassView.js';
import type { PropertyView } from './DSL_Diagram_PropertyView.js';
import type { GeneralizationView } from './DSL_Diagram_GeneralizationView.js';
import type { AssociationView } from './DSL_Diagram_AssociationView.js';
import {
  type PackageableElementVisitor,
  PackageableElement,
} from '@finos/legend-graph';
import { DIAGRAM_HASH_STRUCTURE } from '../../../../DSL_Diagram_HashUtils.js';

export class Diagram extends PackageableElement implements Hashable {
  classViews: ClassView[] = [];
  associationViews: AssociationView[] = [];
  generalizationViews: GeneralizationView[] = [];
  propertyViews: PropertyView[] = [];

  protected override get _elementHashCode(): string {
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
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}
