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

import { list, createSimpleSchema, custom, alias, serialize, primitive } from 'serializr';
import { DerivedProperty as MM_DerivedProperty } from 'MM/model/packageableElements/domain/DerivedProperty';
import { Constraint as MM_Constraint } from 'MM/model/packageableElements/domain/Constraint';
import { Stereotype as MM_Stereotype } from 'MM/model/packageableElements/domain/Stereotype';
import { Tag as MM_Tag } from 'MM/model/packageableElements/domain/Tag';
import { GenericTypeReference as MM_GenericTypeReference } from 'MM/model/packageableElements/domain/GenericTypeReference';
import { Measure as MM_Measure } from 'MM/model/packageableElements/domain/Measure';
import { AbstractProperty as MM_AbstractProperty } from 'MM/model/packageableElements/domain/AbstractProperty';
import { PackageableElementType } from 'V1/model/packageableElements/PackageableElement';
import { usingModelSchema, constant, packagePathSerializer, SKIP_FN, transformArray, plainSerializer, optionalPlainSerializer, optionalPrimitiveSerializer, elementReferenceSerializer, multiplicitySchema } from './CoreSerializerHelper';
import { valueSpecificationSerializer } from 'V1/transformation/pureGraph/serializer/ValueSpecificationSerializer';

export const propertyPtrSerializationSchema = createSimpleSchema({
  ownerReference: alias('class', elementReferenceSerializer),
  value: alias('property', custom((property: MM_AbstractProperty) => property.name, SKIP_FN)),
});

const stereotypePtrSchema = createSimpleSchema({
  ownerReference: alias('profile', elementReferenceSerializer),
  value: custom((stereotype: MM_Stereotype) => stereotype.value, SKIP_FN)
});

const tagPtrSchema = createSimpleSchema({
  ownerReference: alias('profile', elementReferenceSerializer),
  value: custom((tag: MM_Tag) => tag.value, SKIP_FN)
});

const taggedValueSchema = createSimpleSchema({
  tag: usingModelSchema(tagPtrSchema),
  value: primitive(),
});

export const profileSerializationSchema = createSimpleSchema({
  _type: constant(PackageableElementType.PROFILE),
  name: primitive(),
  package: packagePathSerializer,
  stereotypes: list(custom(stereotype => stereotype.value, SKIP_FN)),
  tags: list(custom(tag => tag.value, SKIP_FN))
});

const enumSchema = createSimpleSchema({
  stereotypes: custom(values => transformArray(values, value => serialize(stereotypePtrSchema, value), true), SKIP_FN),
  taggedValues: custom(values => transformArray(values, value => serialize(taggedValueSchema, value), true), SKIP_FN),
  name: alias('value', primitive()),
});

const unitSchema = createSimpleSchema({
  _type: constant(PackageableElementType.UNIT),
  name: primitive(),
  conversionFunction: valueSpecificationSerializer,
  measure: custom((element: MM_Measure) => element.path, SKIP_FN),
  package: packagePathSerializer,
});

export const measureSerializationSchema = createSimpleSchema({
  _type: constant(PackageableElementType.MEASURE),
  canonicalUnit: usingModelSchema(unitSchema),
  name: primitive(),
  nonCanonicalUnits: list(usingModelSchema(unitSchema)),
  package: packagePathSerializer,
});

export const enumerationSerializationSchema = createSimpleSchema({
  _type: constant(PackageableElementType.ENUMERATION),
  name: primitive(),
  package: packagePathSerializer,
  stereotypes: custom(values => transformArray(values, value => serialize(stereotypePtrSchema, value), true), SKIP_FN),
  taggedValues: custom(values => transformArray(values, value => serialize(taggedValueSchema, value), true), SKIP_FN),
  values: list(usingModelSchema(enumSchema))
});

const propertySchema = createSimpleSchema({
  multiplicity: usingModelSchema(multiplicitySchema),
  name: primitive(),
  stereotypes: custom(values => transformArray(values, value => serialize(stereotypePtrSchema, value), true), SKIP_FN),
  taggedValues: custom(values => transformArray(values, value => serialize(taggedValueSchema, value), true), SKIP_FN),
  genericType: alias('type', custom((value: MM_GenericTypeReference) => value.ownerReference.valueForSerialization, SKIP_FN)),
});

const derivedPropertySchema = createSimpleSchema({
  body: optionalPlainSerializer,
  name: primitive(),
  parameters: optionalPlainSerializer,
  multiplicity: alias('returnMultiplicity', usingModelSchema(multiplicitySchema)),
  genericType: alias('returnType', custom((value: MM_GenericTypeReference) => value.ownerReference.valueForSerialization, SKIP_FN)),
  stereotypes: custom(values => transformArray(values, value => serialize(stereotypePtrSchema, value), true), SKIP_FN),
  taggedValues: custom(values => transformArray(values, value => serialize(taggedValueSchema, value), true), SKIP_FN),
});

const constraintSchema = createSimpleSchema({
  functionDefinition: valueSpecificationSerializer,
  name: primitive(),
  externalId: optionalPrimitiveSerializer,
  enforcementLevel: optionalPrimitiveSerializer,
  messageFunction: optionalPlainSerializer
});

export const classSerializationSchema = createSimpleSchema({
  _type: constant(PackageableElementType.CLASS),
  constraints: custom(values => transformArray(values.filter((constraint: MM_Constraint) => !constraint.isStub), value => serialize(constraintSchema, value), true), SKIP_FN),
  name: primitive(),
  package: packagePathSerializer,
  properties: custom(values => transformArray(values, value => serialize(propertySchema, value), true), SKIP_FN),
  derivedProperties: alias('qualifiedProperties', custom(values => transformArray(values.filter((dp: MM_DerivedProperty) => !dp.isStub), value => serialize(derivedPropertySchema, value), true), SKIP_FN)),
  stereotypes: custom(values => transformArray(values, value => serialize(stereotypePtrSchema, value), true), SKIP_FN),
  generalizations: alias('superTypes', custom(values => transformArray(values, (value: MM_GenericTypeReference) => value.ownerReference.valueForSerialization, true), SKIP_FN)),
  taggedValues: custom(values => transformArray(values, value => serialize(taggedValueSchema, value), true), SKIP_FN),
});

export const associationSerializationSchema = createSimpleSchema({
  _type: constant(PackageableElementType.ASSOCIATION),
  name: primitive(),
  package: packagePathSerializer,
  properties: list(usingModelSchema(propertySchema)),
  derivedProperties: alias('qualifiedProperties', custom(values => transformArray(values.filter((dp: MM_DerivedProperty) => !dp.isStub), value => serialize(derivedPropertySchema, value), true), SKIP_FN)),
  stereotypes: custom(values => transformArray(values, value => serialize(stereotypePtrSchema, value), true), SKIP_FN),
  taggedValues: custom(values => transformArray(values, value => serialize(taggedValueSchema, value), true), SKIP_FN),
});

export const functionSerializationSchema = createSimpleSchema({
  _type: constant(PackageableElementType.FUNCTION),
  body: list(plainSerializer),
  name: primitive(),
  package: packagePathSerializer,
  parameters: list(valueSpecificationSerializer),
  returnMultiplicity: usingModelSchema(multiplicitySchema),
  returnType: elementReferenceSerializer,
  stereotypes: custom(values => transformArray(values, value => serialize(stereotypePtrSchema, value), true), SKIP_FN),
  taggedValues: custom(values => transformArray(values, value => serialize(taggedValueSchema, value), true), SKIP_FN),
});
