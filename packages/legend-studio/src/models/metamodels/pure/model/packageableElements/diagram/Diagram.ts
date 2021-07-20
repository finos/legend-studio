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

import { observable, action, makeObservable, override } from 'mobx';
import {
  hashArray,
  addUniqueEntry,
  deleteEntry,
} from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type { ClassView } from './ClassView';
import type { PropertyView } from './PropertyView';
import type { PackageableElementVisitor } from '../../../model/packageableElements/PackageableElement';
import { PackageableElement } from '../../../model/packageableElements/PackageableElement';
import type { GeneralizationView } from './GeneralizationView';
import type { AssociationView } from './AssociationView';
import type { BasicModel } from '../../../graph/BasicModel';

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
      setClassViews: action,
      addClassView: action,
      deleteClassView: action,
      setAssociationViews: action,
      deleteAssociationView: action,
      setGeneralizationViews: action,
      addGeneralizationView: action,
      deleteGeneralizationView: action,
      setPropertyViews: action,
      addPropertyView: action,
      deletePropertyView: action,
      _elementHashCode: override,
    });
  }

  cleanUpDeadReferences(graph: BasicModel): void {
    // Delete orphan property views
    const propertyViewsToRemove = this.propertyViews.filter(
      (p) =>
        !p.property.ownerReference.value.properties
          .map((p) => p.name)
          .includes(p.property.value.name),
    );
    propertyViewsToRemove.forEach((propertyView) =>
      this.deletePropertyView(propertyView),
    );

    const classesSet = new Set(graph.classes);

    // Fix orphan class views
    const classViewsRoRemove = this.classViews.filter(
      (cv) => !classesSet.has(cv.class.value),
    );
    classViewsRoRemove.forEach((cw) => this.deleteClassView(cw));

    // Fix orphan gneralization views
    const generalizationViewsToRemove = this.generalizationViews.filter((g) => {
      const srcClass = g.from.classView.value.class.value;
      const targetClass = g.to.classView.value.class.value;
      return (
        !classesSet.has(srcClass) ||
        !classesSet.has(targetClass) ||
        srcClass.generalizations.filter((c) => c.value.rawType === targetClass)
          .length === 0
      );
    });
    generalizationViewsToRemove.forEach((g) =>
      this.deleteGeneralizationView(g),
    );
  }

  setClassViews(val: ClassView[]): void {
    this.classViews = val;
  }
  addClassView(val: ClassView): void {
    addUniqueEntry(this.classViews, val);
  }
  deleteClassView(val: ClassView): void {
    deleteEntry(this.classViews, val);
  }
  setAssociationViews(val: AssociationView[]): void {
    this.associationViews = val;
  }
  deleteAssociationView(val: AssociationView): void {
    deleteEntry(this.associationViews, val);
  }
  setGeneralizationViews(val: GeneralizationView[]): void {
    this.generalizationViews = val;
  }
  addGeneralizationView(val: GeneralizationView): void {
    addUniqueEntry(this.generalizationViews, val);
  }
  deleteGeneralizationView(val: GeneralizationView): void {
    deleteEntry(this.generalizationViews, val);
  }
  setPropertyViews(val: PropertyView[]): void {
    this.propertyViews = val;
  }
  addPropertyView(val: PropertyView): void {
    addUniqueEntry(this.propertyViews, val);
  }
  deletePropertyView(val: PropertyView): void {
    deleteEntry(this.propertyViews, val);
  }

  getClassView = (sourceViewId: string): ClassView | undefined =>
    this.classViews.find((c) => c.id === sourceViewId);

  protected override get _elementHashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DIAGRAM,
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
    return visitor.visit_Diagram(this);
  }
}
