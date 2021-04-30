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
  isNonNullable,
  assertTrue,
} from '@finos/legend-studio-shared';
import type { Class } from '../../../../../../../metamodels/pure/model/packageableElements/domain/Class';
import type { Association } from '../../../../../../../metamodels/pure/model/packageableElements/domain/Association';
import type { Measure } from '../../../../../../../metamodels/pure/model/packageableElements/domain/Measure';
import { Unit } from '../../../../../../../metamodels/pure/model/packageableElements/domain/Measure';
import { Property } from '../../../../../../../metamodels/pure/model/packageableElements/domain/Property';
import { DerivedProperty } from '../../../../../../../metamodels/pure/model/packageableElements/domain/DerivedProperty';
import { RawVariableExpression } from '../../../../../../../metamodels/pure/model/rawValueSpecification/RawVariableExpression';
import { TaggedValue } from '../../../../../../../metamodels/pure/model/packageableElements/domain/TaggedValue';
import { Constraint } from '../../../../../../../metamodels/pure/model/packageableElements/domain/Constraint';
import type { BasicModel } from '../../../../../../../metamodels/pure/graph/BasicModel';
import type {
  AbstractProperty,
  PropertyOwner,
} from '../../../../../../../metamodels/pure/model/packageableElements/domain/AbstractProperty';
import type { V1_ValueSpecification } from '../../../../model/valueSpecification/V1_ValueSpecification';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext';
import type { V1_Constraint } from '../../../../model/packageableElements/domain/V1_Constraint';
import type { V1_RawVariable } from '../../../../model/rawValueSpecification/V1_RawVariable';
import type { V1_Property } from '../../../../model/packageableElements/domain/V1_Property';
import type { V1_DerivedProperty } from '../../../../model/packageableElements/domain/V1_DerivedProperty';
import type { V1_Unit } from '../../../../model/packageableElements/domain/V1_Measure';
import type { V1_TaggedValue } from '../../../../model/packageableElements/domain/V1_TaggedValue';
import { V1_rawLambdaBuilderWithResolver } from './V1_RawLambdaResolver';

export const V1_processTaggedValue = (
  taggedValue: V1_TaggedValue,
  context: V1_GraphBuilderContext,
): TaggedValue | undefined => {
  assertNonNullable(taggedValue.tag, 'Tagged value tag pointer is missing');
  return new TaggedValue(
    context.resolveTag(taggedValue.tag),
    taggedValue.value,
  );
};

export const V1_processClassConstraint = (
  constraint: V1_Constraint,
  _class: Class,
  context: V1_GraphBuilderContext,
): Constraint => {
  assertNonEmptyString(constraint.name, 'Class constraint name is missing');
  assertNonNullable(
    constraint.functionDefinition,
    'Class constraint function definition is missing',
  );
  const pureConstraint = new Constraint(
    constraint.name,
    _class,
    V1_rawLambdaBuilderWithResolver(
      context,
      constraint.functionDefinition.parameters,
      constraint.functionDefinition.body,
    ),
  );
  pureConstraint.enforcementLevel = constraint.enforcementLevel;
  pureConstraint.externalId = constraint.externalId;
  pureConstraint.messageFunction = constraint.messageFunction
    ? V1_rawLambdaBuilderWithResolver(
        context,
        constraint.messageFunction.parameters,
        constraint.messageFunction.body,
      )
    : constraint.messageFunction;
  return pureConstraint;
};

export const V1_processVariable = (
  variable: V1_RawVariable,
  context: V1_GraphBuilderContext,
): RawVariableExpression => {
  assertNonEmptyString(variable.name, 'Variable name is missing');
  assertNonEmptyString(variable.class, 'Variable class is missing');
  assertNonNullable(variable.multiplicity, 'Variable multiplicity is missing');
  const multiplicity = context.graph.getMultiplicity(
    variable.multiplicity.lowerBound,
    variable.multiplicity.upperBound,
  );
  const type = context.resolveType(variable.class);
  return new RawVariableExpression(variable.name, multiplicity, type);
};

export const V1_processUnit = (
  unit: V1_Unit,
  parentMeasure: Measure,
  currentGraph: BasicModel,
  context: V1_GraphBuilderContext,
): Unit => {
  assertNonEmptyString(unit.package, 'Unit package is missing');
  assertNonEmptyString(unit.name, 'Unit name is missing');
  // TODO process unit conversion function, when we start processing value specification, we might want to separate this
  const pureUnit = new Unit(
    unit.name,
    parentMeasure,
    unit.conversionFunction
      ? V1_rawLambdaBuilderWithResolver(
          context,
          unit.conversionFunction.parameters,
          unit.conversionFunction.body,
        )
      : undefined,
  );
  const path = currentGraph.buildPackageString(unit.package, unit.name);
  assertTrue(
    !currentGraph.getNullableElement(path),
    `Element '${path}' already exists`,
  );
  currentGraph
    .getOrCreatePackageWithPackageName(unit.package)
    .addElement(pureUnit);
  currentGraph.setType(path, pureUnit);
  return pureUnit;
};

export const V1_processProperty = (
  property: V1_Property,
  context: V1_GraphBuilderContext,
  owner: PropertyOwner,
): Property => {
  assertNonEmptyString(property.name, 'Property name is missing');
  assertNonEmptyString(property.type, 'Property type is missing');
  assertNonNullable(property.multiplicity, 'Property multiplicity is missing');
  // NOTE: pass in parent class added for quick conversion to pure protocol down the line
  const pureProperty = new Property(
    property.name,
    context.graph.getMultiplicity(
      property.multiplicity.lowerBound,
      property.multiplicity.upperBound,
    ),
    context.resolveGenericType(property.type),
    owner,
  );
  pureProperty.stereotypes = property.stereotypes
    .map((stereotype) => context.resolveStereotype(stereotype))
    .filter(isNonNullable);
  pureProperty.taggedValues = property.taggedValues
    .map((taggedValue) => V1_processTaggedValue(taggedValue, context))
    .filter(isNonNullable);
  return pureProperty;
};

export const V1_processDerivedProperty = (
  property: V1_DerivedProperty,
  context: V1_GraphBuilderContext,
  owner: PropertyOwner,
): DerivedProperty => {
  assertNonEmptyString(property.name, 'Derived property name is missing');
  assertNonEmptyString(
    property.returnType,
    'Derived property return type is missing',
  );
  assertNonNullable(
    property.returnMultiplicity,
    'Derived property return multiplicity is missing',
  );
  const derivedProperty = new DerivedProperty(
    property.name,
    context.graph.getMultiplicity(
      property.returnMultiplicity.lowerBound,
      property.returnMultiplicity.upperBound,
    ),
    context.resolveGenericType(property.returnType),
    owner,
  );
  derivedProperty.stereotypes = property.stereotypes
    .map((stereotype) => context.resolveStereotype(stereotype))
    .filter(isNonNullable);
  derivedProperty.taggedValues = property.taggedValues
    .map((taggedValue) => V1_processTaggedValue(taggedValue, context))
    .filter(isNonNullable);
  const rawLambda = V1_rawLambdaBuilderWithResolver(
    context,
    property.parameters,
    property.body,
  );
  derivedProperty.body = rawLambda.body;
  derivedProperty.parameters = rawLambda.parameters;
  return derivedProperty;
};

export const V1_processAssociationProperty = (
  currentProperty: V1_Property,
  associatedProperty: V1_Property,
  context: V1_GraphBuilderContext,
  pureAssociation: Association,
): Property => {
  const associatedPropertyClassType = guaranteeNonNullable(
    associatedProperty.type,
    'Association associated property type is missing',
  );
  const associatedClass = context.resolveClass(associatedPropertyClassType);
  const property = V1_processProperty(
    currentProperty,
    context,
    pureAssociation,
  );
  associatedClass.value.propertiesFromAssociations.push(property);
  return property;
};

const isCompatibleDerivedProperty = (
  o: DerivedProperty,
  name: string,
  params: V1_ValueSpecification[],
): boolean =>
  o.name === name &&
  Array.isArray(o.parameters) &&
  o.parameters.length === params.length;

export const V1_getAppliedProperty = (
  parentClass: Class,
  parameters: V1_ValueSpecification[] | undefined,
  name: string,
): AbstractProperty => {
  // TODO: C3 Linearzation
  let property = parentClass.getAllProperties().find((p) => p.name === name);
  if (property) {
    return property;
  }
  property = parentClass.derivedProperties.find((p) =>
    parameters
      ? isCompatibleDerivedProperty(p, name, parameters)
      : name === p.name,
  );
  return guaranteeNonNullable(
    property,
    `Property '${name}' not found in class '${parentClass.path}'`,
  );
};
