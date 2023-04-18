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

import { addUniqueEntry, changeEntry, deleteEntry } from '@finos/legend-shared';
import { action } from 'mobx';
import type { AssociationView } from '../../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_AssociationView.js';
import type { ClassView } from '../../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_ClassView.js';
import type { Diagram } from '../../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_Diagram.js';
import type { GeneralizationView } from '../../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_GeneralizationView.js';
import {
  _findOrBuildPoint,
  _relationshipView_simplifyPath,
  _relationshipView_setPath,
} from '../../graph/helpers/DSL_Diagram_Helper.js';
import type { PropertyView } from '../../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_PropertyView.js';
import type { RelationshipViewEnd } from '../../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_RelationshipViewEnd.js';
import type { RelationshipView } from '../../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_RelationshipView.js';
import type { Point } from '../../graph/metamodel/pure/packageableElements/diagram/geometry/DSL_Diagram_Point.js';
import type { PositionedRectangle } from '../../graph/metamodel/pure/packageableElements/diagram/geometry/DSL_Diagram_PositionedRectangle.js';
import type { Rectangle } from '../../graph/metamodel/pure/packageableElements/diagram/geometry/DSL_Diagram_Rectangle.js';
import {
  observe_AssociationView,
  observe_ClassView,
  observe_GeneralizationView,
  observe_PropertyView,
} from '../../graph-manager/action/changeDetection/DSL_Diagram_ObserverHelper.js';

export const diagram_setClassViews = action(
  (diagram: Diagram, val: ClassView[]): void => {
    diagram.classViews = val.map(observe_ClassView);
  },
);
export const diagram_addClassView = action(
  (diagram: Diagram, val: ClassView): void => {
    addUniqueEntry(diagram.classViews, observe_ClassView(val));
  },
);
export const diagram_deleteClassView = action(
  (diagram: Diagram, val: ClassView): void => {
    deleteEntry(diagram.classViews, val);
  },
);
export const diagram_setAssociationViews = action(
  (diagram: Diagram, val: AssociationView[]): void => {
    diagram.associationViews = val.map(observe_AssociationView);
  },
);
export const diagram_deleteAssociationView = action(
  (diagram: Diagram, val: AssociationView): void => {
    deleteEntry(diagram.associationViews, val);
  },
);
export const diagram_setGeneralizationViews = action(
  (diagram: Diagram, val: GeneralizationView[]): void => {
    diagram.generalizationViews = val.map(observe_GeneralizationView);
  },
);
export const diagram_addGeneralizationView = action(
  (diagram: Diagram, val: GeneralizationView): void => {
    addUniqueEntry(
      diagram.generalizationViews,
      observe_GeneralizationView(val),
    );
  },
);
export const diagram_deleteGeneralizationView = action(
  (diagram: Diagram, val: GeneralizationView): void => {
    deleteEntry(diagram.generalizationViews, val);
  },
);
export const diagram_setPropertyViews = action(
  (diagram: Diagram, val: PropertyView[]): void => {
    diagram.propertyViews = val.map(observe_PropertyView);
  },
);
export const diagram_addPropertyView = action(
  (diagram: Diagram, val: PropertyView): void => {
    addUniqueEntry(diagram.propertyViews, observe_PropertyView(val));
  },
);
export const diagram_deletePropertyView = action(
  (diagram: Diagram, val: PropertyView): void => {
    deleteEntry(diagram.propertyViews, val);
  },
);

export const classView_setHideProperties = action(
  (cv: ClassView, val: boolean): void => {
    cv.hideProperties = val;
  },
);
export const classView_setHideStereotypes = action(
  (cv: ClassView, val: boolean): void => {
    cv.hideStereotypes = val;
  },
);
export const classView_setHideTaggedValues = action(
  (cv: ClassView, val: boolean): void => {
    cv.hideTaggedValues = val;
  },
);
export const relationshipEdgeView_setOffsetX = action(
  (r: RelationshipViewEnd, val: number): void => {
    r._offsetX = val;
  },
);
export const relationshipEdgeView_setOffsetY = action(
  (r: RelationshipViewEnd, val: number): void => {
    r._offsetY = val;
  },
);

// NOTE: To optimize performance, for now, we will not observe point (path)
export const relationshipView_changePoint = action(
  (v: RelationshipView, val: Point, newVal: Point): void => {
    changeEntry(v.path, val, newVal);
  },
);

export const relationshipView_simplifyPath = action(
  _relationshipView_simplifyPath,
);

export const findOrBuildPoint = action(_findOrBuildPoint);
export const relationshipView_setPath = action(_relationshipView_setPath);

// NOTE: To optimize performance, for now, we will not observe rectangle
export const positionedRectangle_setRectangle = action(
  (pR: PositionedRectangle, value: Rectangle): void => {
    pR.rectangle = value;
  },
);

// NOTE: To optimize performance, for now, we will not observe point (path)
export const positionedRectangle_setPosition = action(
  (pR: PositionedRectangle, value: Point): void => {
    pR.position = value;
  },
);

/**
 * NOTE: Having `position` and `rectangle` as observables compromises the performance of diagram
 * so we want to have a way to refresh the hash for change detection to pick up new hash when we resize
 * the class view box or move it.
 *
 * We should re-consider the usefulness of this method, maybe it's more worthwhile to recompute hash
 * for the whole diagram instead?
 */
export const positionedRectangle_forceRefreshHash = action(
  (pR: PositionedRectangle): void => {
    pR._dummyObservable = {};
  },
);
