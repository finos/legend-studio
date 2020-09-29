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

import { list, createSimpleSchema, custom, alias, primitive } from 'serializr';
import { RelationShipEdgeView as MM_RelationShipEdgeView } from 'MM/model/packageableElements/diagram/RelationshipEdgeView';
import { PackageableElementType } from 'V1/model/packageableElements/PackageableElement';
import { SKIP_FN, usingModelSchema, constant, packagePathSerializer, elementReferenceSerializer } from './CoreSerializerHelper';
import { propertyPtrSerializationSchema } from './DomainSerializerHelper';

const relationshipEdgeViewSerializer = custom((value: MM_RelationShipEdgeView) => value.classView.value.id, SKIP_FN);

const pointSchema = createSimpleSchema({
  x: primitive(),
  y: primitive(),
});

const rectangleSchema = createSimpleSchema({
  height: primitive(),
  width: primitive(),
});

const classViewSchema = createSimpleSchema({
  class: elementReferenceSerializer,
  hideProperties: custom(value => value ? Boolean(value) : undefined, SKIP_FN),
  hideStereotypes: custom(value => value ? Boolean(value) : undefined, SKIP_FN),
  hideTaggedValues: custom(value => value ? Boolean(value) : undefined, SKIP_FN),
  id: primitive(),
  position: usingModelSchema(pointSchema),
  rectangle: usingModelSchema(rectangleSchema),
});

const propertyViewSchema = createSimpleSchema({
  fullPath: alias('line', custom(values => ({ points: values as unknown[] }), SKIP_FN)),
  property: usingModelSchema(propertyPtrSerializationSchema),
  from: alias('sourceView', relationshipEdgeViewSerializer),
  to: alias('targetView', relationshipEdgeViewSerializer),
});

const generalizationViewSchema = createSimpleSchema({
  fullPath: alias('line', custom(values => ({ points: values as unknown[] }), SKIP_FN)),
  from: alias('sourceView', relationshipEdgeViewSerializer),
  to: alias('targetView', relationshipEdgeViewSerializer),
});

export const diagramSerializationSchema = createSimpleSchema({
  _type: constant(PackageableElementType.DIAGRAM),
  classViews: list(usingModelSchema(classViewSchema)),
  generalizationViews: list(usingModelSchema(generalizationViewSchema)),
  name: primitive(),
  package: packagePathSerializer,
  propertyViews: list(usingModelSchema(propertyViewSchema)),
});
