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

import { observable, makeObservable, override } from 'mobx';
import { hashArray, type Hashable } from '@finos/legend-shared';
import type { ClassView } from './DSLDiagram_ClassView';
import type { PropertyView } from './DSLDiagram_PropertyView';
import type { GeneralizationView } from './DSLDiagram_GeneralizationView';
import type { AssociationView } from './DSLDiagram_AssociationView';
import {
  type PackageableElementVisitor,
  PackageableElement,
} from '@finos/legend-graph';
import { DIAGRAM_HASH_STRUCTURE } from '../../../../DSLDiagram_ModelUtils';

export class Diagram extends PackageableElement implements Hashable {
  classViews: ClassView[] = [];
  associationViews: AssociationView[] = [];
  generalizationViews: GeneralizationView[] = [];
  propertyViews: PropertyView[] = [];

  constructor(name: string) {
    super(name);

    makeObservable<Diagram, '_elementHashCode'>(this, {
      classViews: observable,
      associationViews: observable,
      generalizationViews: observable,
      propertyViews: observable,
      _elementHashCode: override,
    });
  }

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
