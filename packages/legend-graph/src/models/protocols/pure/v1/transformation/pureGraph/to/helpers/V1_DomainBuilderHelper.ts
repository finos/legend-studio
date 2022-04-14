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
} from '@finos/legend-shared';
import type { Class } from '../../../../../../../metamodels/pure/packageableElements/domain/Class';
import type { Association } from '../../../../../../../metamodels/pure/packageableElements/domain/Association';
import {
  type Measure,
  Unit,
} from '../../../../../../../metamodels/pure/packageableElements/domain/Measure';
import { Property } from '../../../../../../../metamodels/pure/packageableElements/domain/Property';
import { DerivedProperty } from '../../../../../../../metamodels/pure/packageableElements/domain/DerivedProperty';
import { RawVariableExpression } from '../../../../../../../metamodels/pure/rawValueSpecification/RawVariableExpression';
import { TaggedValue } from '../../../../../../../metamodels/pure/packageableElements/domain/TaggedValue';
import { Constraint } from '../../../../../../../metamodels/pure/packageableElements/domain/Constraint';
import type { BasicModel } from '../../../../../../../../graph/BasicModel';
import type {
  AbstractProperty,
  PropertyOwner,
} from '../../../../../../../metamodels/pure/packageableElements/domain/AbstractProperty';
import type { V1_ValueSpecification } from '../../../../model/valueSpecification/V1_ValueSpecification';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext';
import type { V1_Constraint } from '../../../../model/packageableElements/domain/V1_Constraint';
import type { V1_RawVariable } from '../../../../model/rawValueSpecification/V1_RawVariable';
import type { V1_Property } from '../../../../model/packageableElements/domain/V1_Property';
import type { V1_DerivedProperty } from '../../../../model/packageableElements/domain/V1_DerivedProperty';
import type { V1_Unit } from '../../../../model/packageableElements/domain/V1_Measure';
import type { V1_TaggedValue } from '../../../../model/packageableElements/domain/V1_TaggedValue';
import { V1_buildRawLambdaWithResolvedPaths } from './V1_ValueSpecificationPathResolver';
import { _package_addElement } from '../../../../../../../../helpers/DomainHelper';

export const V1_buildTaggedValue = (
  taggedValue: V1_TaggedValue,
  context: V1_GraphBuilderContext,
): TaggedValue | undefined => {
  assertNonNullable(taggedValue.tag, `Tagged value 'tag' field is missing`);
  return new TaggedValue(
    context.resolveTag(taggedValue.tag),
    taggedValue.value,
  );
};

export const V1_buildConstraint = (
  constraint: V1_Constraint,
  _class: Class,
  context: V1_GraphBuilderContext,
): Constraint => {
  assertNonEmptyString(
    constraint.name,
    `Class constraint 'name' field is missing or empty`,
  );
  assertNonNullable(
    constraint.functionDefinition,
    `Class constraint 'functionDefinition' field is missing`,
  );
  const pureConstraint = new Constraint(
    constraint.name,
    _class,
    V1_buildRawLambdaWithResolvedPaths(
      constraint.functionDefinition.parameters,
      constraint.functionDefinition.body,
      context,
    ),
  );
  pureConstraint.enforcementLevel = constraint.enforcementLevel;
  pureConstraint.externalId = constraint.externalId;
  pureConstraint.messageFunction = constraint.messageFunction
    ? V1_buildRawLambdaWithResolvedPaths(
        constraint.messageFunction.parameters,
        constraint.messageFunction.body,
        context,
      )
    : constraint.messageFunction;
  return pureConstraint;
};

export const V1_buildVariable = (
  variable: V1_RawVariable,
  context: V1_GraphBuilderContext,
): RawVariableExpression => {
  assertNonEmptyString(
    variable.name,
    `Variable 'name' field is missing or empty`,
  );
  assertNonEmptyString(
    variable.class,
    `Variable 'class' field is missing or empty`,
  );
  assertNonNullable(
    variable.multiplicity,
    `Variable 'multiplicity' field is missing`,
  );
  const multiplicity = context.graph.getMultiplicity(
    variable.multiplicity.lowerBound,
    variable.multiplicity.upperBound,
  );
  const type = context.resolveType(variable.class);
  return new RawVariableExpression(variable.name, multiplicity, type);
};

export const V1_buildUnit = (
  unit: V1_Unit,
  parentMeasure: Measure,
  currentGraph: BasicModel,
  context: V1_GraphBuilderContext,
): Unit => {
  assertNonEmptyString(
    unit.package,
    `Unit 'package' field is missing or empty`,
  );
  assertNonEmptyString(unit.name, `Unit 'name' field is missing or empty`);
  // TODO process unit conversion function, when we start processing value specification, we might want to separate this
  const pureUnit = new Unit(
    unit.name,
    parentMeasure,
    unit.conversionFunction
      ? V1_buildRawLambdaWithResolvedPaths(
          unit.conversionFunction.parameters,
          unit.conversionFunction.body,
          context,
        )
      : undefined,
  );
  const path = currentGraph.buildPath(unit.package, unit.name);
  assertTrue(
    !currentGraph.getOwnNullableElement(path),
    `Element '${path}' already exists`,
  );
  _package_addElement(currentGraph.getOrCreatePackage(unit.package), pureUnit);
  currentGraph.setOwnType(path, pureUnit);
  return pureUnit;
};

export const V1_buildProperty = (
  property: V1_Property,
  context: V1_GraphBuilderContext,
  owner: PropertyOwner,
): Property => {
  assertNonEmptyString(
    property.name,
    `Property 'name' field is missing or empty`,
  );
  assertNonEmptyString(
    property.type,
    `Property 'type' field is missing or empty`,
  );
  assertNonNullable(
    property.multiplicity,
    `Property 'multiplicity' field is missing or empty`,
  );
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
    .map((taggedValue) => V1_buildTaggedValue(taggedValue, context))
    .filter(isNonNullable);
  return pureProperty;
};

export const V1_buildDerivedProperty = (
  property: V1_DerivedProperty,
  context: V1_GraphBuilderContext,
  owner: PropertyOwner,
): DerivedProperty => {
  assertNonEmptyString(
    property.name,
    `Derived property 'name' field is missing or empty`,
  );
  assertNonEmptyString(
    property.returnType,
    `Derived property 'returnType' field is missing or empty`,
  );
  assertNonNullable(
    property.returnMultiplicity,
    `Derived property 'returnMultiplicity' field is missing`,
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
    .map((taggedValue) => V1_buildTaggedValue(taggedValue, context))
    .filter(isNonNullable);
  const rawLambda = V1_buildRawLambdaWithResolvedPaths(
    property.parameters,
    property.body,
    context,
  );
  derivedProperty.body = rawLambda.body;
  derivedProperty.parameters = rawLambda.parameters;
  return derivedProperty;
};

export const V1_buildAssociationProperty = (
  currentProperty: V1_Property,
  associatedProperty: V1_Property,
  context: V1_GraphBuilderContext,
  pureAssociation: Association,
): Property => {
  const associatedPropertyClassType = guaranteeNonNullable(
    associatedProperty.type,
    `Association associated property 'type' field is missing`,
  );
  const associatedClass = context.resolveClass(associatedPropertyClassType);
  const property = V1_buildProperty(currentProperty, context, pureAssociation);
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
  // We add 1 to account for the `this` parameter in the derived property
  o.parameters.length + 1 === params.length;

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
