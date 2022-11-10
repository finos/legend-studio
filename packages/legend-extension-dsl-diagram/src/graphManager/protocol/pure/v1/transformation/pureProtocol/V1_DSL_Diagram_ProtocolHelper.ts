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

import { createModelSchema, list, optional, primitive } from 'serializr';
import {
  usingConstantValueSchema,
  usingModelSchema,
} from '@finos/legend-shared';
import { V1_ClassView } from '../../model/packageableElements/diagram/V1_DSL_Diagram_ClassView.js';
import { V1_Diagram } from '../../model/packageableElements/diagram/V1_DSL_Diagram_Diagram.js';
import { V1_Point } from '../../model/packageableElements/diagram/geometry/V1_DSL_Diagram_Point.js';
import { V1_Rectangle } from '../../model/packageableElements/diagram/geometry/V1_DSL_Diagram_Rectangle.js';
import { V1_Line } from '../../model/packageableElements/diagram/geometry/V1_DSL_Diagram_Line.js';
import { V1_PropertyView } from '../../model/packageableElements/diagram/V1_DSL_Diagram_PropertyView.js';
import { V1_GeneralizationView } from '../../model/packageableElements/diagram/V1_DSL_Diagram_GeneralizationView.js';
import { V1_propertyPointerModelSchema } from '@finos/legend-graph';

export const V1_DIAGRAM_ELEMENT_PROTOCOL_TYPE = 'diagram';

const pointModelSchema = createModelSchema(V1_Point, {
  x: primitive(),
  y: primitive(),
});

const recantagleModelSchema = createModelSchema(V1_Rectangle, {
  height: primitive(),
  width: primitive(),
});

const lineModelSchema = createModelSchema(V1_Line, {
  points: list(usingModelSchema(pointModelSchema)),
});

const classViewModelSchema = createModelSchema(V1_ClassView, {
  class: primitive(),
  hideProperties: optional(primitive()),
  hideStereotypes: optional(primitive()),
  hideTaggedValues: optional(primitive()),
  id: primitive(),
  position: usingModelSchema(pointModelSchema),
  rectangle: usingModelSchema(recantagleModelSchema),
});

const propertyViewModelSchema = createModelSchema(V1_PropertyView, {
  line: usingModelSchema(lineModelSchema),
  property: usingModelSchema(V1_propertyPointerModelSchema),
  sourceView: primitive(),
  targetView: primitive(),
});

const generalizationViewModelSchema = createModelSchema(V1_GeneralizationView, {
  line: usingModelSchema(lineModelSchema),
  sourceView: primitive(),
  targetView: primitive(),
});

export const V1_diagramModelSchema = createModelSchema(V1_Diagram, {
  _type: usingConstantValueSchema(V1_DIAGRAM_ELEMENT_PROTOCOL_TYPE),
  classViews: list(usingModelSchema(classViewModelSchema)),
  generalizationViews: list(usingModelSchema(generalizationViewModelSchema)),
  name: primitive(),
  package: primitive(),
  propertyViews: list(usingModelSchema(propertyViewModelSchema)),
});
