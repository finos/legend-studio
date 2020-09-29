/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { observable, action, computed } from 'mobx';
import { hashArray } from 'Utilities/HashUtil';
import { IllegalStateError, addUniqueEntry, deleteEntry } from 'Utilities/GeneralUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { ClassView } from './ClassView';
import { PropertyView } from './PropertyView';
import { PackageableElement, PackageableElementVisitor } from 'MM/model/packageableElements/PackageableElement';
import { GeneralizationView } from './GeneralizationView';
import { AssociationView } from './AssociationView';

export class Diagram extends PackageableElement implements Hashable {
  @observable classViews: ClassView[] = [];
  @observable associationViews: AssociationView[] = [];
  @observable generalizationViews: GeneralizationView[] = [];
  @observable propertyViews: PropertyView[] = [];

  @action setClassViews(val: ClassView[]): void { this.classViews = val }
  @action addClassView(val: ClassView): void { addUniqueEntry(this.classViews, val) }
  @action deleteClassView(val: ClassView): void { deleteEntry(this.classViews, val) }
  @action setAssociationViews(val: AssociationView[]): void { this.associationViews = val }
  @action deleteAssociationView(val: AssociationView): void { deleteEntry(this.associationViews, val) }
  @action setGeneralizationViews(val: GeneralizationView[]): void { this.generalizationViews = val }
  @action addGeneralizationView(val: GeneralizationView): void { addUniqueEntry(this.generalizationViews, val) }
  @action deleteGeneralizationView(val: GeneralizationView): void { deleteEntry(this.generalizationViews, val) }
  @action setPropertyViews(val: PropertyView[]): void { this.propertyViews = val }
  @action addPropertyView(val: PropertyView): void { addUniqueEntry(this.propertyViews, val) }
  @action deletePropertyView(val: PropertyView): void { deleteEntry(this.propertyViews, val) }

  getClassView = (sourceViewId: string): ClassView | undefined => this.classViews.find(c => c.id === sourceViewId);

  @computed({ keepAlive: true }) get hashCode(): string {
    if (this._isDisposed) { throw new IllegalStateError(`Element '${this.path}' is already disposed`) }
    if (this._isImmutable) { throw new IllegalStateError(`Readonly element '${this.path}' is modified`) }
    return hashArray([
      HASH_STRUCTURE.DIAGRAM,
      super.hashCode,
      hashArray(this.classViews),
      // TODO: association views
      hashArray(this.generalizationViews),
      hashArray(this.propertyViews),
    ]);
  }

  accept_PackageableElementVisitor<T>(visitor: PackageableElementVisitor<T>): T {
    return visitor.visit_Diagram(this);
  }
}
