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
import type { AssociationView } from '../../../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_AssociationView.js';
import type { ClassView } from '../../../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_ClassView.js';
import type { ClassViewReference } from '../../../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_ClassViewReference.js';
import type { Diagram } from '../../../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_Diagram.js';
import type { GeneralizationView } from '../../../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_GeneralizationView.js';
import type { PropertyView } from '../../../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_PropertyView.js';
import type { RelationshipViewEnd } from '../../../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_RelationshipViewEnd.js';
import type { RelationshipView } from '../../../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_RelationshipView.js';
import type { PositionedRectangle } from '../../../graph/metamodel/pure/packageableElements/diagram/geometry/DSL_Diagram_PositionedRectangle.js';

export const observe_PositionedRectangle = skipObserved(
  (metamodel: PositionedRectangle): PositionedRectangle =>
    makeObservable(metamodel, {
      _dummyObservable: observable,
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
  (metamodel: RelationshipViewEnd): RelationshipViewEnd => {
    observe_ClassViewReference(metamodel.classView);

    return metamodel;
  },
);

export const observe_RelationshipView = skipObserved(
  (metamodel: RelationshipView): RelationshipView => {
    makeObservable(metamodel, {
      // NOTE: to optimize performance for diagram, we have made classview's position and rectangle non-observable
      // if we want to further optimize, perhaps we can also remove observability from path
      path: observable,
      pathForSerialization: computed,
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
