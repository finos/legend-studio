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

import { toJS } from 'mobx';
import type { DerivedProperty } from '../../../../../../metamodels/pure/model/packageableElements/domain/DerivedProperty';
import type { Constraint } from '../../../../../../metamodels/pure/model/packageableElements/domain/Constraint';
import type {
  Measure,
  Unit,
} from '../../../../../../metamodels/pure/model/packageableElements/domain/Measure';
import type { Enum } from '../../../../../../metamodels/pure/model/packageableElements/domain/Enum';
import type { Profile } from '../../../../../../metamodels/pure/model/packageableElements/domain/Profile';
import type { StereotypeReference } from '../../../../../../metamodels/pure/model/packageableElements/domain/StereotypeReference';
import type { TaggedValue } from '../../../../../../metamodels/pure/model/packageableElements/domain/TaggedValue';
import type { Enumeration } from '../../../../../../metamodels/pure/model/packageableElements/domain/Enumeration';
import type { Class } from '../../../../../../metamodels/pure/model/packageableElements/domain/Class';
import type { Association } from '../../../../../../metamodels/pure/model/packageableElements/domain/Association';
import type { ConcreteFunctionDefinition } from '../../../../../../metamodels/pure/model/packageableElements/domain/ConcreteFunctionDefinition';
import type { Property } from '../../../../../../metamodels/pure/model/packageableElements/domain/Property';
import { V1_Profile } from '../../../model/packageableElements/domain/V1_Profile';
import { V1_StereotypePtr } from '../../../model/packageableElements/domain/V1_StereotypePtr';
import {
  V1_initPackageableElement,
  V1_transformMultiplicity,
  V1_transformElementReference,
} from './V1_CoreTransformerHelper';
import { V1_TaggedValue } from '../../../model/packageableElements/domain/V1_TaggedValue';
import { V1_TagPtr } from '../../../model/packageableElements/domain/V1_TagPtr';
import { V1_Enumeration } from '../../../model/packageableElements/domain/V1_Enumeration';
import { V1_EnumValue } from '../../../model/packageableElements/domain/V1_EnumValue';
import {
  V1_Measure,
  V1_Unit,
} from '../../../model/packageableElements/domain/V1_Measure';
import { V1_Class } from '../../../model/packageableElements/domain/V1_Class';
import { V1_Association } from '../../../model/packageableElements/domain/V1_Association';
import { V1_ConcreteFunctionDefinition } from '../../../model/packageableElements/function/V1_ConcreteFunctionDefinition';
import { V1_RawValueSpecificationTransformer } from './V1_RawValueSpecificationTransformer';
import type { V1_RawLambda } from '../../../model/rawValueSpecification/V1_RawLambda';
import { V1_Constraint } from '../../../model/packageableElements/domain/V1_Constraint';
import { V1_Property } from '../../../model/packageableElements/domain/V1_Property';
import { V1_DerivedProperty } from '../../../model/packageableElements/domain/V1_DerivedProperty';
import type { V1_RawVariable } from '../../../model/rawValueSpecification/V1_RawVariable';

export const V1_transformProfile = (element: Profile): V1_Profile => {
  const profile = new V1_Profile();
  V1_initPackageableElement(profile, element);
  profile.stereotypes = element.stereotypes.map((s) => s.value);
  profile.tags = element.tags.map((t) => t.value);
  return profile;
};

const transformStereotype = (
  element: StereotypeReference,
): V1_StereotypePtr => {
  const stereotype = new V1_StereotypePtr();
  stereotype.profile = V1_transformElementReference(element.ownerReference);
  stereotype.value = element.value.value;
  return stereotype;
};

const transformTaggedValue = (element: TaggedValue): V1_TaggedValue => {
  const taggedValue = new V1_TaggedValue();
  taggedValue.value = element.value;
  taggedValue.tag = new V1_TagPtr();
  taggedValue.tag.profile = V1_transformElementReference(
    element.tag.ownerReference,
  );
  taggedValue.tag.value = element.tag.value.value;
  return taggedValue;
};

const transformEnumValue = (element: Enum): V1_EnumValue => {
  const enumValue = new V1_EnumValue();
  enumValue.stereotypes = element.stereotypes.map(transformStereotype);
  enumValue.taggedValues = element.taggedValues.map(transformTaggedValue);
  enumValue.value = element.name;
  return enumValue;
};

export const V1_transformEnumeration = (
  element: Enumeration,
): V1_Enumeration => {
  const enumeration = new V1_Enumeration();
  V1_initPackageableElement(enumeration, element);
  enumeration.stereotypes = element.stereotypes.map(transformStereotype);
  enumeration.taggedValues = element.taggedValues.map(transformTaggedValue);
  enumeration.values = element.values.map(transformEnumValue);
  return enumeration;
};

const transformUnit = (element: Unit): V1_Unit => {
  const unit = new V1_Unit();
  V1_initPackageableElement(unit, element);
  unit.conversionFunction =
    element.conversionFunction?.accept_ValueSpecificationVisitor(
      new V1_RawValueSpecificationTransformer(),
    ) as V1_RawLambda | undefined;
  unit.measure = element.measure.path;
  return unit;
};

export const V1_transformMeasure = (element: Measure): V1_Measure => {
  const measure = new V1_Measure();
  V1_initPackageableElement(measure, element);
  measure.canonicalUnit = element.canonicalUnit
    ? transformUnit(element.canonicalUnit)
    : undefined;
  measure.nonCanonicalUnits = element.nonCanonicalUnits.map(transformUnit);
  return measure;
};

const transformConstraint = (element: Constraint): V1_Constraint => {
  const constraint = new V1_Constraint();
  constraint.functionDefinition =
    element.functionDefinition.accept_ValueSpecificationVisitor(
      new V1_RawValueSpecificationTransformer(),
    ) as V1_RawLambda;
  constraint.name = element.name;
  constraint.externalId = element.externalId;
  constraint.enforcementLevel = element.enforcementLevel;
  if (element.messageFunction && !element.messageFunction.isStub) {
    constraint.messageFunction =
      element.messageFunction.accept_ValueSpecificationVisitor(
        new V1_RawValueSpecificationTransformer(),
      ) as V1_RawLambda;
  }
  return constraint;
};

const transformProperty = (element: Property): V1_Property => {
  const property = new V1_Property();
  property.name = element.name;
  property.multiplicity = V1_transformMultiplicity(element.multiplicity);
  property.stereotypes = element.stereotypes.map(transformStereotype);
  property.taggedValues = element.taggedValues.map(transformTaggedValue);
  property.type = element.genericType.ownerReference.valueForSerialization;
  return property;
};

const transformDerviedProperty = (
  element: DerivedProperty,
): V1_DerivedProperty => {
  const derivedProperty = new V1_DerivedProperty();
  derivedProperty.name = element.name;
  derivedProperty.body = toJS(element.body);
  derivedProperty.parameters = toJS(element.parameters);
  derivedProperty.returnMultiplicity = V1_transformMultiplicity(
    element.multiplicity,
  );
  derivedProperty.returnType =
    element.genericType.ownerReference.valueForSerialization;
  derivedProperty.stereotypes = element.stereotypes.map(transformStereotype);
  derivedProperty.taggedValues = element.taggedValues.map(transformTaggedValue);
  return derivedProperty;
};

export const V1_transformClass = (element: Class): V1_Class => {
  const _class = new V1_Class();
  V1_initPackageableElement(_class, element);
  _class.constraints = element.constraints.map(transformConstraint);
  _class.properties = element.properties.map(transformProperty);
  _class.stereotypes = element.stereotypes.map(transformStereotype);
  _class.taggedValues = element.taggedValues.map(transformTaggedValue);
  _class.superTypes = element.generalizations.map(
    (e) => e.ownerReference.valueForSerialization,
  );
  _class.derivedProperties = element.derivedProperties.map(
    transformDerviedProperty,
  );
  return _class;
};

export const V1_transformAssociation = (
  element: Association,
): V1_Association => {
  const association = new V1_Association();
  V1_initPackageableElement(association, element);
  association.properties = element.properties.map(transformProperty);
  association.derivedProperties = element.derivedProperties.map(
    transformDerviedProperty,
  );
  association.stereotypes = element.stereotypes.map(transformStereotype);
  association.taggedValues = element.taggedValues.map(transformTaggedValue);
  return association;
};

export const V1_transformFunction = (
  element: ConcreteFunctionDefinition,
): V1_ConcreteFunctionDefinition => {
  const _function = new V1_ConcreteFunctionDefinition();
  V1_initPackageableElement(_function, element);
  _function.body = toJS(element.body);
  _function.parameters = element.parameters.map((v) =>
    toJS(
      v.accept_ValueSpecificationVisitor(
        new V1_RawValueSpecificationTransformer(),
      ) as V1_RawVariable,
    ),
  );
  _function.returnType = V1_transformElementReference(element.returnType);
  _function.stereotypes = element.stereotypes.map(transformStereotype);
  _function.taggedValues = element.taggedValues.map(transformTaggedValue);
  _function.returnMultiplicity = V1_transformMultiplicity(
    element.returnMultiplicity,
  );
  return _function;
};
