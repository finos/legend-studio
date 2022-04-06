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
import type { AssociationView } from '../../models/metamodels/pure/packageableElements/diagram/DSLDiagram_AssociationView';
import type { ClassView } from '../../models/metamodels/pure/packageableElements/diagram/DSLDiagram_ClassView';
import type { Diagram } from '../../models/metamodels/pure/packageableElements/diagram/DSLDiagram_Diagram';
import type { GeneralizationView } from '../../models/metamodels/pure/packageableElements/diagram/DSLDiagram_GeneralizationView';
import {
  _findOrBuildPoint,
  _relationshipView_SimplifyPath as _relationshipView_simplifyPath,
  _relationshipView_setPath,
} from '../../models/metamodels/pure/packageableElements/diagram/DSLDiagram_GraphModifierHelper';
import type { PropertyView } from '../../models/metamodels/pure/packageableElements/diagram/DSLDiagram_PropertyView';
import type { RelationshipEdgeView } from '../../models/metamodels/pure/packageableElements/diagram/DSLDiagram_RelationshipEdgeView';
import type { RelationshipView } from '../../models/metamodels/pure/packageableElements/diagram/DSLDiagram_RelationshipView';
import type { Point } from '../../models/metamodels/pure/packageableElements/diagram/geometry/DSLDiagram_Point';
import type { PositionedRectangle } from '../../models/metamodels/pure/packageableElements/diagram/geometry/DSLDiagram_PositionedRectangle';
import type { Rectangle } from '../../models/metamodels/pure/packageableElements/diagram/geometry/DSLDiagram_Rectangle';

export const diagram_setClassViews = action(
  (diagram: Diagram, val: ClassView[]): void => {
    diagram.classViews = val;
  },
);
export const diagram_addClassView = action(
  (diagram: Diagram, val: ClassView): void => {
    addUniqueEntry(diagram.classViews, val);
  },
);
export const diagram_deleteClassView = action(
  (diagram: Diagram, val: ClassView): void => {
    deleteEntry(diagram.classViews, val);
  },
);
export const diagram_setAssociationViews = action(
  (diagram: Diagram, val: AssociationView[]): void => {
    diagram.associationViews = val;
  },
);
export const diagram_deleteAssociationView = action(
  (diagram: Diagram, val: AssociationView): void => {
    deleteEntry(diagram.associationViews, val);
  },
);
export const diagram_setGeneralizationViews = action(
  (diagram: Diagram, val: GeneralizationView[]): void => {
    diagram.generalizationViews = val;
  },
);
export const diagram_addGeneralizationView = action(
  (diagram: Diagram, val: GeneralizationView): void => {
    addUniqueEntry(diagram.generalizationViews, val);
  },
);
export const diagram_deleteGeneralizationView = action(
  (diagram: Diagram, val: GeneralizationView): void => {
    deleteEntry(diagram.generalizationViews, val);
  },
);
export const diagram_setPropertyViews = action(
  (diagram: Diagram, val: PropertyView[]): void => {
    diagram.propertyViews = val;
  },
);
export const diagram_addPropertyView = action(
  (diagram: Diagram, val: PropertyView): void => {
    addUniqueEntry(diagram.propertyViews, val);
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
  (r: RelationshipEdgeView, val: number): void => {
    r.offsetX = val;
  },
);
export const relationshipEdgeView_setOffsetY = action(
  (r: RelationshipEdgeView, val: number): void => {
    r.offsetY = val;
  },
);

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

export const positionedRectangle_setRectangle = action(
  (pR: PositionedRectangle, value: Rectangle): void => {
    pR.rectangle = value;
  },
);
export const positionedRectangle_setPosition = action(
  (pR: PositionedRectangle, value: Point): void => {
    pR.position = value;
  },
);
/**
 * NOTE: Having `position` and `rectangle` as observables compromises the performance of diagram
 * so we want to have a way to refresh the hash for change detection to pick up new hash when we resize
 * the class view box or move it.
 */
export const positionedRectangle_forceRefreshHash = action(
  (pR: PositionedRectangle): void => {
    pR.dummyObservable = {};
  },
);
