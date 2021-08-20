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
  assertNonEmptyString,
  assertNonNullable,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import type { Diagram } from '../../../../../../../metamodels/pure/packageableElements/diagram/Diagram';
import { ClassView } from '../../../../../../../metamodels/pure/packageableElements/diagram/ClassView';
import { Point } from '../../../../../../../metamodels/pure/packageableElements/diagram/geometry/Point';
import { Rectangle } from '../../../../../../../metamodels/pure/packageableElements/diagram/geometry/Rectangle';
import { PropertyView } from '../../../../../../../metamodels/pure/packageableElements/diagram/PropertyView';
import { GeneralizationView } from '../../../../../../../metamodels/pure/packageableElements/diagram/GeneralizationView';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext';
import type { V1_ClassView } from '../../../../model/packageableElements/diagram/V1_ClassView';
import type { V1_Point } from '../../../../model/packageableElements/diagram/geometry/V1_Point';
import type { V1_Rectangle } from '../../../../model/packageableElements/diagram/geometry/V1_Rectangle';
import type { V1_PropertyView } from '../../../../model/packageableElements/diagram/V1_PropertyView';
import type { V1_GeneralizationView } from '../../../../model/packageableElements/diagram/V1_GeneralizationView';
import { getClassView } from '../../../../../../../../helpers/DiagramHelper';

const buildPoint = (point: V1_Point): Point => {
  const x = guaranteeNonNullable(point.x, 'x coordinate of point is missing');
  const y = guaranteeNonNullable(point.y, 'y coordinate of point is missing');
  return new Point(x, y);
};

const buildRectangle = (rectangle: V1_Rectangle): Rectangle => {
  const width = guaranteeNonNullable(
    rectangle.width,
    'rectangle width is missing',
  );
  const height = guaranteeNonNullable(
    rectangle.height,
    'rectangle height is missing',
  );
  return new Rectangle(width, height);
};

export const V1_buildClassView = (
  classView: V1_ClassView,
  context: V1_GraphBuilderContext,
  diagram: Diagram,
): ClassView => {
  assertNonEmptyString(classView.class, 'Diagram class view class is missing');
  assertNonEmptyString(classView.id, 'Diagram class view ID is missing');
  assertNonNullable(
    classView.rectangle,
    'Diagram class view rectangle is missing',
  );
  assertNonNullable(
    classView.position,
    'Diagram class view position is missing',
  );
  const view = new ClassView(
    diagram,
    classView.id,
    context.resolveClass(classView.class),
  );
  view.hideProperties = Boolean(classView.hideProperties);
  view.hideTaggedValues = Boolean(classView.hideTaggedValues);
  view.hideStereotypes = Boolean(classView.hideStereotypes);
  view.rectangle = buildRectangle(classView.rectangle);
  view.position = buildPoint(classView.position);
  return view;
};

export const V1_buildPropertyView = (
  propertyView: V1_PropertyView,
  context: V1_GraphBuilderContext,
  diagram: Diagram,
): PropertyView => {
  assertNonNullable(
    propertyView.property,
    'Diagram property view property is missing',
  );
  assertNonNullable(propertyView.line, 'Diagram property view line is missing');
  const sourceClassView = guaranteeNonNullable(
    getClassView(diagram, guaranteeNonNullable(propertyView.sourceView)),
    'Diagram property view source class line is missing',
  );
  const targetClassView = guaranteeNonNullable(
    getClassView(diagram, guaranteeNonNullable(propertyView.targetView)),
    'Diagram property view target class is missing',
  );
  const property = context.resolveOwnedProperty(propertyView.property);
  const view = new PropertyView(
    diagram,
    property,
    sourceClassView,
    targetClassView,
  );
  view.path = propertyView.line.points.map((point) => buildPoint(point));
  view.possiblyFlattenPath(); // transform the line because we store only 2 end points that are inside points and we will calculate the offset
  return view;
};

export const V1_buildGeneralizationView = (
  generalizationView: V1_GeneralizationView,
  diagram: Diagram,
): GeneralizationView => {
  const sourceClassView = guaranteeNonNullable(
    getClassView(diagram, guaranteeNonNullable(generalizationView.sourceView)),
    'Diagram property view source class line is missing',
  );
  const targetClassView = guaranteeNonNullable(
    getClassView(diagram, guaranteeNonNullable(generalizationView.targetView)),
    'Diagram property view target class is missing',
  );
  const view = new GeneralizationView(
    diagram,
    sourceClassView,
    targetClassView,
  );
  view.path = generalizationView.line.points.map((point) => buildPoint(point));
  view.possiblyFlattenPath(); // transform the line because we store only 2 end points that are inside points and we will calculate the offset
  return view;
};
