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

import {
  observe_Abstract_PackageableElement,
  observe_PackageableElementReference,
  observe_PropertyReference,
  skipObserved,
} from '@finos/legend-graph';
import { computed, makeObservable, observable, override } from 'mobx';
import type { AssociationView } from '../../../models/metamodels/pure/packageableElements/diagram/DSLDiagram_AssociationView';
import type { ClassView } from '../../../models/metamodels/pure/packageableElements/diagram/DSLDiagram_ClassView';
import type { ClassViewReference } from '../../../models/metamodels/pure/packageableElements/diagram/DSLDiagram_ClassViewReference';
import type { Diagram } from '../../../models/metamodels/pure/packageableElements/diagram/DSLDiagram_Diagram';
import type { GeneralizationView } from '../../../models/metamodels/pure/packageableElements/diagram/DSLDiagram_GeneralizationView';
import type { PropertyView } from '../../../models/metamodels/pure/packageableElements/diagram/DSLDiagram_PropertyView';
import type { RelationshipEdgeView } from '../../../models/metamodels/pure/packageableElements/diagram/DSLDiagram_RelationshipEdgeView';
import type { RelationshipView } from '../../../models/metamodels/pure/packageableElements/diagram/DSLDiagram_RelationshipView';
import type { PositionedRectangle } from '../../../models/metamodels/pure/packageableElements/diagram/geometry/DSLDiagram_PositionedRectangle';

export const observe_PositionedRectangle = skipObserved(
  (metamodel: PositionedRectangle): PositionedRectangle =>
    makeObservable(metamodel, {
      dummyObservable: observable,
    }),
);

export const observe_ClassViewReference = skipObserved(
  (metamodel: ClassViewReference): ClassViewReference => {
    makeObservable(metamodel, {
      value: observable,
    });

    observe_PackageableElementReference(metamodel.ownerReference);

    return metamodel;
  },
);

export const observe_ClassView = skipObserved(
  (metamodel: ClassView): ClassView => {
    observe_PositionedRectangle(metamodel);

    makeObservable(metamodel, {
      id: observable,
      hideProperties: observable,
      hideTaggedValues: observable,
      hideStereotypes: observable,
      hashCode: computed,
    });

    observe_PackageableElementReference(metamodel.class);

    return metamodel;
  },
);

export const observe_RelationShipEdgeView = skipObserved(
  (metamodel: RelationshipEdgeView): RelationshipEdgeView => {
    makeObservable(metamodel, {
      offsetX: observable,
      offsetY: observable,
    });

    observe_ClassViewReference(metamodel.classView);

    return metamodel;
  },
);

export const observe_RelationshipView = skipObserved(
  (metamodel: RelationshipView): RelationshipView => {
    makeObservable(metamodel, {
      path: observable,
      fullPath: computed,
    });

    observe_RelationShipEdgeView(metamodel.from);
    observe_RelationShipEdgeView(metamodel.to);

    return metamodel;
  },
);

export const observe_GeneralizationView = skipObserved(
  (metamodel: GeneralizationView): GeneralizationView => {
    observe_RelationshipView(metamodel);

    makeObservable(metamodel, {
      hashCode: computed,
    });

    return metamodel;
  },
);

export const observe_AssociationView = skipObserved(
  (metamodel: AssociationView): AssociationView => {
    observe_RelationshipView(metamodel);

    makeObservable(metamodel, {
      hashCode: computed,
    });

    observe_PropertyReference(metamodel.property);
    observe_PackageableElementReference(metamodel.association);

    return metamodel;
  },
);

export const observe_PropertyView = skipObserved(
  (metamodel: PropertyView): PropertyView => {
    observe_RelationshipView(metamodel);

    makeObservable(metamodel, {
      hashCode: computed,
    });

    observe_PropertyReference(metamodel.property);

    return metamodel;
  },
);

export const observe_Diagram = skipObserved((metamodel: Diagram): Diagram => {
  observe_Abstract_PackageableElement(metamodel);

  makeObservable<Diagram, '_elementHashCode'>(metamodel, {
    classViews: observable,
    associationViews: observable,
    generalizationViews: observable,
    propertyViews: observable,
    _elementHashCode: override,
  });

  metamodel.classViews.forEach(observe_ClassView);
  metamodel.associationViews.forEach(observe_AssociationView);
  metamodel.generalizationViews.forEach(observe_GeneralizationView);
  metamodel.propertyViews.forEach(observe_PropertyView);

  return metamodel;
});
