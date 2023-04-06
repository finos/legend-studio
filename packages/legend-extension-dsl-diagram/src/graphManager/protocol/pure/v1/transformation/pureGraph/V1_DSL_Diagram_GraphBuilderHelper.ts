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

import { getDiagram } from '../../../../../DSL_Diagram_GraphManagerHelper.js';
import type {
  PackageableElementImplicitReference,
  V1_GraphBuilderContext,
} from '@finos/legend-graph';
import {
  LogEvent,
  assertErrorThrown,
  assertNonEmptyString,
  assertNonNullable,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import type { Diagram } from '../../../../../../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_Diagram.js';
import { ClassView } from '../../../../../../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_ClassView.js';
import { Point } from '../../../../../../graph/metamodel/pure/packageableElements/diagram/geometry/DSL_Diagram_Point.js';
import { Rectangle } from '../../../../../../graph/metamodel/pure/packageableElements/diagram/geometry/DSL_Diagram_Rectangle.js';
import { PropertyView } from '../../../../../../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_PropertyView.js';
import { GeneralizationView } from '../../../../../../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_GeneralizationView.js';
import type { V1_ClassView } from '../../model/packageableElements/diagram/V1_DSL_Diagram_ClassView.js';
import type { V1_Point } from '../../model/packageableElements/diagram/geometry/V1_DSL_Diagram_Point.js';
import type { V1_Rectangle } from '../../model/packageableElements/diagram/geometry/V1_DSL_Diagram_Rectangle.js';
import type { V1_PropertyView } from '../../model/packageableElements/diagram/V1_DSL_Diagram_PropertyView.js';
import type { V1_GeneralizationView } from '../../model/packageableElements/diagram/V1_DSL_Diagram_GeneralizationView.js';
import {
  getClassView,
  _relationshipView_simplifyPath,
} from '../../../../../../graph/helpers/DSL_Diagram_Helper.js';

const buildPoint = (point: V1_Point): Point => {
  const x = guaranteeNonNullable(point.x, `Point 'x' coordinate is missing`);
  const y = guaranteeNonNullable(point.y, `Point 'y' coordinate is missing`);
  return new Point(x, y);
};

const buildRectangle = (rectangle: V1_Rectangle): Rectangle => {
  const width = guaranteeNonNullable(
    rectangle.width,
    `Rectangle 'width' is missing`,
  );
  const height = guaranteeNonNullable(
    rectangle.height,
    `Rectangle 'height' is missing`,
  );
  return new Rectangle(width, height);
};

export const V1_buildClassView = (
  classView: V1_ClassView,
  context: V1_GraphBuilderContext,
  diagram: Diagram,
): ClassView => {
  assertNonEmptyString(
    classView.class,
    `Class view 'class' field is missing or empty`,
  );
  assertNonEmptyString(
    classView.id,
    `Class view 'id' field is missing or empty`,
  );
  assertNonNullable(
    classView.rectangle,
    `Class view 'rectangle' field is missing`,
  );
  assertNonNullable(
    classView.position,
    `Class view 'position' field is missing`,
  );
  const view = new ClassView(
    diagram,
    classView.id,
    context.resolveClass(classView.class),
  );
  view.hideProperties = classView.hideProperties;
  view.hideTaggedValues = classView.hideTaggedValues;
  view.hideStereotypes = classView.hideStereotypes;
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
    `Property view 'property' field is missing`,
  );
  assertNonNullable(propertyView.line, `Property view 'line' field is missing`);
  const sourceClassView = guaranteeNonNullable(
    getClassView(diagram, guaranteeNonNullable(propertyView.sourceView)),
    `Property view 'sourceView' field is missing`,
  );
  const targetClassView = guaranteeNonNullable(
    getClassView(diagram, guaranteeNonNullable(propertyView.targetView)),
    `Property view 'targetView' field is missing`,
  );
  const property = context.resolveOwnProperty(propertyView.property);
  const view = new PropertyView(
    diagram,
    property,
    sourceClassView,
    targetClassView,
  );
  view.path = propertyView.line.points.map((point) => buildPoint(point));
  // transform the line because we store only 2 end points that are inside points and we will calculate the offset
  try {
    _relationshipView_simplifyPath(view);
  } catch (error) {
    // NOTE: this is an optimization to simplify the path, so we should not break graph building if this fails
    assertErrorThrown(error);
    context.logService.warn(LogEvent.create(error.message));
  }
  return view;
};

export const V1_buildGeneralizationView = (
  generalizationView: V1_GeneralizationView,
  diagram: Diagram,
  context: V1_GraphBuilderContext,
): GeneralizationView => {
  assertNonNullable(
    generalizationView.line,
    `Generalization view 'line' field is missing`,
  );
  const sourceClassView = guaranteeNonNullable(
    getClassView(diagram, guaranteeNonNullable(generalizationView.sourceView)),
    `Generalization view 'sourceView' field is missing`,
  );
  const targetClassView = guaranteeNonNullable(
    getClassView(diagram, guaranteeNonNullable(generalizationView.targetView)),
    `Generalization view 'targetView' field is missing`,
  );
  const view = new GeneralizationView(
    diagram,
    sourceClassView,
    targetClassView,
  );
  view.path = generalizationView.line.points.map((point) => buildPoint(point));
  // transform the line because we store only 2 end points that are inside points and we will calculate the offset
  try {
    _relationshipView_simplifyPath(view);
  } catch (error) {
    // NOTE: this is an optimization to simplify the path, so we should not break graph building if this fails
    assertErrorThrown(error);
    context.logService.warn(LogEvent.create(error.message));
  }
  return view;
};

export const V1_resolveDiagram = (
  path: string,
  context: V1_GraphBuilderContext,
): PackageableElementImplicitReference<Diagram> =>
  context.createImplicitPackageableElementReference(path, (_path: string) =>
    getDiagram(_path, context.graph),
  );
