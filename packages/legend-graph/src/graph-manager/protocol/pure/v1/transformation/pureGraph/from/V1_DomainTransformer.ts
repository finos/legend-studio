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

import type { DerivedProperty } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/DerivedProperty.js';
import type { Constraint } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Constraint.js';
import type {
  Measure,
  Unit,
} from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Measure.js';
import type { Enum } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Enum.js';
import type { Profile } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Profile.js';
import type { StereotypeReference } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/StereotypeReference.js';
import type { TaggedValue } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/TaggedValue.js';
import type { Enumeration } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Enumeration.js';
import type { Class } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Class.js';
import type { Association } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Association.js';
import type { ConcreteFunctionDefinition } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/ConcreteFunctionDefinition.js';
import type { Property } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Property.js';
import { V1_Profile } from '../../../model/packageableElements/domain/V1_Profile.js';
import { V1_StereotypePtr } from '../../../model/packageableElements/domain/V1_StereotypePtr.js';
import {
  V1_initPackageableElement,
  V1_transformMultiplicity,
} from './V1_CoreTransformerHelper.js';
import { V1_TaggedValue } from '../../../model/packageableElements/domain/V1_TaggedValue.js';
import { V1_TagPtr } from '../../../model/packageableElements/domain/V1_TagPtr.js';
import { V1_Enumeration } from '../../../model/packageableElements/domain/V1_Enumeration.js';
import { V1_EnumValue } from '../../../model/packageableElements/domain/V1_EnumValue.js';
import {
  V1_Measure,
  V1_Unit,
} from '../../../model/packageableElements/domain/V1_Measure.js';
import { V1_Class } from '../../../model/packageableElements/domain/V1_Class.js';
import { V1_Association } from '../../../model/packageableElements/domain/V1_Association.js';
import { V1_ConcreteFunctionDefinition } from '../../../model/packageableElements/function/V1_ConcreteFunctionDefinition.js';
import { V1_RawValueSpecificationTransformer } from './V1_RawValueSpecificationTransformer.js';
import type { V1_RawLambda } from '../../../model/rawValueSpecification/V1_RawLambda.js';
import { V1_Constraint } from '../../../model/packageableElements/domain/V1_Constraint.js';
import { V1_Property } from '../../../model/packageableElements/domain/V1_Property.js';
import { V1_DerivedProperty } from '../../../model/packageableElements/domain/V1_DerivedProperty.js';
import type { V1_RawVariable } from '../../../model/rawValueSpecification/V1_RawVariable.js';
import type { V1_GraphTransformerContext } from './V1_GraphTransformerContext.js';
import { isStubbed_RawLambda } from '../../../../../../../graph/helpers/creator/RawValueSpecificationCreatorHelper.js';

export const V1_transformProfile = (element: Profile): V1_Profile => {
  const profile = new V1_Profile();
  V1_initPackageableElement(profile, element);
  profile.stereotypes = element.p_stereotypes.map((s) => s.value);
  profile.tags = element.p_tags.map((t) => t.value);
  return profile;
};

export const V1_transformStereotype = (
  element: StereotypeReference,
): V1_StereotypePtr => {
  const stereotype = new V1_StereotypePtr();
  stereotype.profile = element.ownerReference.valueForSerialization ?? '';
  stereotype.value = element.value.value;
  return stereotype;
};

export const V1_transformTaggedValue = (
  element: TaggedValue,
): V1_TaggedValue => {
  const taggedValue = new V1_TaggedValue();
  taggedValue.value = element.value;
  taggedValue.tag = new V1_TagPtr();
  taggedValue.tag.profile =
    element.tag.ownerReference.valueForSerialization ?? '';
  taggedValue.tag.value = element.tag.value.value;
  return taggedValue;
};

const transformEnumValue = (element: Enum): V1_EnumValue => {
  const enumValue = new V1_EnumValue();
  enumValue.stereotypes = element.stereotypes.map(V1_transformStereotype);
  enumValue.taggedValues = element.taggedValues.map(V1_transformTaggedValue);
  enumValue.value = element.name;
  return enumValue;
};

export const V1_transformEnumeration = (
  element: Enumeration,
): V1_Enumeration => {
  const enumeration = new V1_Enumeration();
  V1_initPackageableElement(enumeration, element);
  enumeration.stereotypes = element.stereotypes.map(V1_transformStereotype);
  enumeration.taggedValues = element.taggedValues.map(V1_transformTaggedValue);
  enumeration.values = element.values.map(transformEnumValue);
  return enumeration;
};

const transformUnit = (
  element: Unit,
  context: V1_GraphTransformerContext,
): V1_Unit => {
  const unit = new V1_Unit();
  V1_initPackageableElement(unit, element);
  unit.conversionFunction =
    element.conversionFunction?.accept_RawValueSpecificationVisitor(
      new V1_RawValueSpecificationTransformer(context),
    ) as V1_RawLambda | undefined;
  unit.measure = element.measure.path;
  return unit;
};

export const V1_transformMeasure = (
  element: Measure,
  context: V1_GraphTransformerContext,
): V1_Measure => {
  const measure = new V1_Measure();
  V1_initPackageableElement(measure, element);
  measure.canonicalUnit = element.canonicalUnit
    ? transformUnit(element.canonicalUnit, context)
    : undefined;
  measure.nonCanonicalUnits = element.nonCanonicalUnits.map((unit) =>
    transformUnit(unit, context),
  );
  return measure;
};

const transformConstraint = (
  element: Constraint,
  context: V1_GraphTransformerContext,
): V1_Constraint => {
  const constraint = new V1_Constraint();
  constraint.functionDefinition =
    element.functionDefinition.accept_RawValueSpecificationVisitor(
      new V1_RawValueSpecificationTransformer(context),
    ) as V1_RawLambda;
  constraint.name = element.name;
  constraint.externalId = element.externalId;
  constraint.enforcementLevel = element.enforcementLevel;
  if (
    element.messageFunction &&
    !isStubbed_RawLambda(element.messageFunction)
  ) {
    constraint.messageFunction =
      element.messageFunction.accept_RawValueSpecificationVisitor(
        new V1_RawValueSpecificationTransformer(context),
      ) as V1_RawLambda;
  }
  return constraint;
};

const transformProperty = (element: Property): V1_Property => {
  const property = new V1_Property();
  property.name = element.name;
  property.multiplicity = V1_transformMultiplicity(element.multiplicity);
  property.stereotypes = element.stereotypes.map(V1_transformStereotype);
  property.taggedValues = element.taggedValues.map(V1_transformTaggedValue);
  property.type =
    element.genericType.ownerReference.valueForSerialization ?? '';
  property.aggregation = element.aggregation;
  return property;
};

const transformDerivedProperty = (
  element: DerivedProperty,
  context: V1_GraphTransformerContext,
): V1_DerivedProperty => {
  const derivedProperty = new V1_DerivedProperty();
  derivedProperty.name = element.name;
  derivedProperty.body = element.body;
  derivedProperty.parameters = element.parameters;
  derivedProperty.returnMultiplicity = V1_transformMultiplicity(
    element.multiplicity,
  );
  derivedProperty.returnType =
    element.genericType.ownerReference.valueForSerialization ?? '';
  derivedProperty.stereotypes = element.stereotypes.map(V1_transformStereotype);
  derivedProperty.taggedValues = element.taggedValues.map(
    V1_transformTaggedValue,
  );
  return derivedProperty;
};

export const V1_transformClass = (
  element: Class,
  context: V1_GraphTransformerContext,
): V1_Class => {
  const _class = new V1_Class();
  V1_initPackageableElement(_class, element);
  _class.constraints = element.constraints.map((constraint) =>
    transformConstraint(constraint, context),
  );
  _class.properties = element.properties.map(transformProperty);
  _class.stereotypes = element.stereotypes.map(V1_transformStereotype);
  _class.taggedValues = element.taggedValues.map(V1_transformTaggedValue);
  _class.superTypes = element.generalizations.map(
    (e) => e.ownerReference.valueForSerialization ?? '',
  );
  _class.derivedProperties = element.derivedProperties.map((dp) =>
    transformDerivedProperty(dp, context),
  );
  return _class;
};

export const V1_transformAssociation = (
  element: Association,
  context: V1_GraphTransformerContext,
): V1_Association => {
  const association = new V1_Association();
  V1_initPackageableElement(association, element);
  association.properties = element.properties.map(transformProperty);
  association.derivedProperties = element.derivedProperties.map((dp) =>
    transformDerivedProperty(dp, context),
  );
  association.stereotypes = element.stereotypes.map(V1_transformStereotype);
  association.taggedValues = element.taggedValues.map(V1_transformTaggedValue);
  return association;
};

export const V1_transformFunction = (
  element: ConcreteFunctionDefinition,
  context: V1_GraphTransformerContext,
): V1_ConcreteFunctionDefinition => {
  const _function = new V1_ConcreteFunctionDefinition();
  V1_initPackageableElement(_function, element);
  _function.body = element.expressionSequence;
  _function.parameters = element.parameters.map(
    (v) =>
      v.accept_RawValueSpecificationVisitor(
        new V1_RawValueSpecificationTransformer(context),
      ) as V1_RawVariable,
  );
  _function.returnType = element.returnType.valueForSerialization ?? '';
  _function.stereotypes = element.stereotypes.map(V1_transformStereotype);
  _function.taggedValues = element.taggedValues.map(V1_transformTaggedValue);
  _function.returnMultiplicity = V1_transformMultiplicity(
    element.returnMultiplicity,
  );
  return _function;
};
