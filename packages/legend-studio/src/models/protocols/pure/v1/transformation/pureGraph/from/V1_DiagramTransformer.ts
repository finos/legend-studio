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

import type { ClassView } from '../../../../../../metamodels/pure/model/packageableElements/diagram/ClassView';
import type { Diagram } from '../../../../../../metamodels/pure/model/packageableElements/diagram/Diagram';
import type { GeneralizationView } from '../../../../../../metamodels/pure/model/packageableElements/diagram/GeneralizationView';
import type { PropertyView } from '../../../../../../metamodels/pure/model/packageableElements/diagram/PropertyView';
import type { RelationShipEdgeView } from '../../../../../../metamodels/pure/model/packageableElements/diagram/RelationshipEdgeView';
import { V1_Point } from '../../../model/packageableElements/diagram/geometry/V1_Point';
import { V1_ClassView } from '../../../model/packageableElements/diagram/V1_ClassView';
import { V1_Diagram } from '../../../model/packageableElements/diagram/V1_Diagram';
import { V1_GeneralizationView } from '../../../model/packageableElements/diagram/V1_GeneralizationView';
import { V1_Line } from '../../../model/packageableElements/diagram/geometry/V1_Line';
import { V1_Rectangle } from '../../../model/packageableElements/diagram/geometry/V1_Rectangle';
import {
  V1_initPackageableElement,
  V1_transformElementReference,
} from './V1_CoreTransformerHelper';
import { V1_PropertyView } from '../../../model/packageableElements/diagram/V1_PropertyView';
import { V1_transformPropertyReference } from './V1_MappingTransformer';

const relationshipEdgeViewTransformer = (value: RelationShipEdgeView): string =>
  value.classView.value.id;

const createRectangle = (height: number, width: number): V1_Rectangle => {
  const rectangle = new V1_Rectangle();
  rectangle.height = height;
  rectangle.width = width;
  return rectangle;
};

const createPoint = (x: number, y: number): V1_Point => {
  const point = new V1_Point();
  point.x = x;
  point.y = y;
  return point;
};

const transformPropertyView = (element: PropertyView): V1_PropertyView => {
  const view = new V1_PropertyView();
  const line = new V1_Line();
  line.points = element.fullPath;
  view.line = line;
  view.property = V1_transformPropertyReference(element.property, false);
  view.sourceView = relationshipEdgeViewTransformer(element.from);
  view.targetView = relationshipEdgeViewTransformer(element.to);
  return view;
};

const transformGenerationView = (
  element: GeneralizationView,
): V1_GeneralizationView => {
  const view = new V1_GeneralizationView();
  const line = new V1_Line();
  line.points = element.fullPath;
  view.line = line;
  view.sourceView = relationshipEdgeViewTransformer(element.from);
  view.targetView = relationshipEdgeViewTransformer(element.to);
  return view;
};

const transformClassView = (element: ClassView): V1_ClassView => {
  const _classView = new V1_ClassView();
  _classView.class = V1_transformElementReference(element.class);
  _classView.hideProperties = element.hideProperties
    ? Boolean(element.hideProperties)
    : undefined;
  _classView.hideStereotypes = element.hideStereotypes
    ? Boolean(element.hideStereotypes)
    : undefined;
  _classView.hideTaggedValues = element.hideTaggedValues
    ? Boolean(element.hideTaggedValues)
    : undefined;
  _classView.id = element.id;
  _classView.position = createPoint(element.position.x, element.position.y);
  _classView.rectangle = createRectangle(
    element.rectangle.height,
    element.rectangle.width,
  );
  return _classView;
};

export const V1_transformDiagram = (element: Diagram): V1_Diagram => {
  const diagram = new V1_Diagram();
  V1_initPackageableElement(diagram, element);
  diagram.classViews = element.classViews.map(transformClassView);
  diagram.generalizationViews = element.generalizationViews.map(
    transformGenerationView,
  );
  diagram.propertyViews = element.propertyViews.map(transformPropertyView);
  return diagram;
};
