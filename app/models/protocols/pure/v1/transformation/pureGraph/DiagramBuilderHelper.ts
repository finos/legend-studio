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

import { assertNonEmptyString, assertNonNullable, guaranteeNonNullable } from 'Utilities/GeneralUtil';
import { Diagram as MM_Diagram } from 'MM/model/packageableElements/diagram/Diagram';
import { ClassView as MM_ClassView } from 'MM/model/packageableElements/diagram/ClassView';
import { Point as MM_Point } from 'MM/model/packageableElements/diagram/geometry/Point';
import { Rectangle as MM_Rectangle } from 'MM/model/packageableElements/diagram/geometry/Rectangle';
import { PropertyView as MM_PropertyView } from 'MM/model/packageableElements/diagram/PropertyView';
import { GeneralizationView as MM_GeneralizationView } from 'MM/model/packageableElements/diagram/GeneralizationView';
import { GraphBuilderContext } from './GraphBuilderContext';
import { ClassView } from 'V1/model/packageableElements/diagram/ClassView';
import { Point } from 'V1/model/packageableElements/diagram/geometry/Point';
import { Rectangle } from 'V1/model/packageableElements/diagram/geometry/Rectangle';
import { PropertyView } from 'V1/model/packageableElements/diagram/PropertyView';
import { GeneralizationView } from 'V1/model/packageableElements/diagram/GeneralizationView';

const processPoint = (point: Point): MM_Point => {
  const x = guaranteeNonNullable(point.x, 'x coordinate of point is missing');
  const y = guaranteeNonNullable(point.y, 'y coordinate of point is missing');
  return new MM_Point(x, y);
};

const processRectangle = (rectangle: Rectangle): MM_Rectangle => {
  const width = guaranteeNonNullable(rectangle.width, 'rectangle width is missing');
  const height = guaranteeNonNullable(rectangle.height, 'rectangle height is missing');
  return new MM_Rectangle(width, height);
};

export const processClassView = (classView: ClassView, context: GraphBuilderContext, diagram: MM_Diagram): MM_ClassView => {
  assertNonEmptyString(classView.class, 'Diagram class view class is missing');
  assertNonEmptyString(classView.id, 'Diagram class view ID is missing');
  assertNonNullable(classView.rectangle, 'Diagram class view rectangle is missing');
  assertNonNullable(classView.position, 'Diagram class view position is missing');
  const view = new MM_ClassView(diagram, classView.id, context.resolveClass(classView.class));
  view.hideProperties = Boolean(classView.hideProperties);
  view.hideTaggedValues = Boolean(classView.hideTaggedValues);
  view.hideStereotypes = Boolean(classView.hideStereotypes);
  view.rectangle = processRectangle(classView.rectangle);
  view.position = processPoint(classView.position);
  return view;
};

export const processPropertyView = (propertyView: PropertyView, context: GraphBuilderContext, diagram: MM_Diagram): MM_PropertyView => {
  assertNonNullable(propertyView.property, 'Diagram property view property is missing');
  assertNonNullable(propertyView.line, 'Diagram property view line is missing');
  const sourceClassView = guaranteeNonNullable(diagram.getClassView(guaranteeNonNullable(propertyView.sourceView)), 'Diagram property view source class line is missing');
  const targetClassView = guaranteeNonNullable(diagram.getClassView(guaranteeNonNullable(propertyView.targetView)), 'Diagram property view target class is missing');
  const property = context.resolveOwnedProperty(propertyView.property);
  const view = new MM_PropertyView(diagram, property, sourceClassView, targetClassView);
  view.path = propertyView.line.points.map(point => processPoint(point));
  view.possiblyFlattenPath(); // transform the line because we store only 2 end points that are inside points and we will calculate the offset
  return view;
};

export const processGeneralizationView = (generalizationView: GeneralizationView, diagram: MM_Diagram): MM_GeneralizationView => {
  const sourceClassView = guaranteeNonNullable(diagram.getClassView(guaranteeNonNullable(generalizationView.sourceView)), 'Diagram property view source class line is missing');
  const targetClassView = guaranteeNonNullable(diagram.getClassView(guaranteeNonNullable(generalizationView.targetView)), 'Diagram property view target class is missing');
  const view = new MM_GeneralizationView(diagram, sourceClassView, targetClassView);
  view.path = generalizationView.line.points.map(point => processPoint(point));
  view.possiblyFlattenPath(); // transform the line because we store only 2 end points that are inside points and we will calculate the offset
  return view;
};
