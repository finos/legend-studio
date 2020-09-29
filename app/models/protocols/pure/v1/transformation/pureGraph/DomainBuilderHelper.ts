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

import { assertNonEmptyString, assertNonNullable, guaranteeNonNullable, isNonNullable, assertTrue } from 'Utilities/GeneralUtil';
import { Class as MM_Class } from 'MM/model/packageableElements/domain/Class';
import { Association as MM_Association } from 'MM/model/packageableElements/domain/Association';
import { Measure as MM_Measure, Unit as MM_Unit } from 'MM/model/packageableElements/domain/Measure';
import { Property as MM_Property } from 'MM/model/packageableElements/domain/Property';
import { DerivedProperty as MM_DerivedProperty } from 'MM/model/packageableElements/domain/DerivedProperty';
import { VariableExpression as MM_VariableExpression } from 'MM/model/valueSpecification/VariableExpression';
import { TaggedValue as MM_TaggedValue } from 'MM/model/packageableElements/domain/TaggedValue';
import { Constraint as MM_Constraint } from 'MM/model/packageableElements/domain/Constraint';
import { Lambda as MM_Lambda } from 'MM/model/valueSpecification/raw/Lambda';
import { BasicModel as MM_BasicModel } from 'MM/BasicModel';
import { PropertyOwner as MM_PropertyOwner } from 'MM/model/packageableElements/domain/AbstractProperty';
import { GraphBuilderContext } from './GraphBuilderContext';
import { Constraint } from 'V1/model/packageableElements/domain/Constraint';
import { Variable } from 'V1/model/valueSpecification/Variable';
import { Property } from 'V1/model/packageableElements/domain/Property';
import { DerivedProperty } from 'V1/model/packageableElements/domain/DerivedProperty';
import { Unit } from 'V1/model/packageableElements/domain/Measure';
import { TaggedValue } from 'V1/model/packageableElements/domain/TaggedValue';

export const processTaggedValue = (taggedValue: TaggedValue, context: GraphBuilderContext): MM_TaggedValue | undefined => {
  assertNonNullable(taggedValue.tag, 'Tagged value tag pointer is missing');
  return new MM_TaggedValue(context.resolveTag(taggedValue.tag), taggedValue.value);
};

export const processClassConstraint = (constraint: Constraint, _class: MM_Class): MM_Constraint => {
  assertNonEmptyString(constraint.name, 'Class constraint name is missing');
  assertNonNullable(constraint.functionDefinition, 'Class constraint function definition is missing');
  const pureConstraint = new MM_Constraint(constraint.name, _class, new MM_Lambda(constraint.functionDefinition.parameters, constraint.functionDefinition.body));
  pureConstraint.enforcementLevel = constraint.enforcementLevel;
  pureConstraint.externalId = constraint.externalId;
  pureConstraint.messageFunction = constraint.messageFunction ? new MM_Lambda(constraint.messageFunction.parameters, constraint.messageFunction.body) : constraint.messageFunction;
  return pureConstraint;
};

export const processVariable = (variable: Variable, context: GraphBuilderContext): MM_VariableExpression => {
  assertNonEmptyString(variable.name, 'Variable name is missing');
  assertNonEmptyString(variable.class, 'Variable class is missing');
  assertNonNullable(variable.multiplicity, 'Variable multiplicity is missing');
  const multiplicity = context.graph.getMultiplicity(variable.multiplicity.lowerBound, variable.multiplicity.upperBound);
  const type = context.resolveType(variable.class);
  return new MM_VariableExpression(variable.name, multiplicity, type);
};

export const processUnit = (unit: Unit, targetGraph: MM_BasicModel | undefined, parentMeasure: MM_Measure): MM_Unit => {
  assertNonNullable(targetGraph, 'Tager graph is required while processing unit');
  assertNonEmptyString(unit.package, 'Unit package is missing');
  assertNonEmptyString(unit.name, 'Unit name is missing');
  assertNonNullable(unit.conversionFunction, 'Unit conversion function is missing');
  // TODO process unit conversion function, when we start processing value specification, we might want to separate this
  const pureUnit = new MM_Unit(unit.name, parentMeasure, new MM_Lambda(unit.conversionFunction.parameters, unit.conversionFunction.body));
  const path = targetGraph.buildPackageString(unit.package, unit.name);
  assertTrue(!targetGraph.getNullableElement(path), `Element '${path}' already exists`);
  targetGraph.getOrCreatePackageWithPackageName(unit.package).addElement(pureUnit);
  targetGraph.setType(path, pureUnit);
  return pureUnit;
};

export const processProperty = (property: Property, context: GraphBuilderContext, owner: MM_PropertyOwner): MM_Property => {
  assertNonEmptyString(property.name, 'Property name is missing');
  assertNonEmptyString(property.type, 'Property type is missing');
  assertNonNullable(property.multiplicity, 'Property multiplicity is missing');
  // NOTE: pass in parent class added for quick conversion to pure protocol down the line
  const pureProperty = new MM_Property(property.name, context.graph.getMultiplicity(property.multiplicity.lowerBound, property.multiplicity.upperBound), context.resolveGenericType(property.type), owner);
  pureProperty.stereotypes = property.stereotypes.map(stereotype => context.resolveStereotype(stereotype)).filter(isNonNullable);
  pureProperty.taggedValues = property.taggedValues.map(taggedValue => processTaggedValue(taggedValue, context)).filter(isNonNullable);
  return pureProperty;
};

export const processDerivedProperty = (property: DerivedProperty, context: GraphBuilderContext, owner: MM_PropertyOwner): MM_DerivedProperty => {
  assertNonEmptyString(property.name, 'Derived property name is missing');
  assertNonEmptyString(property.returnType, 'Derived property return type is missing');
  assertNonNullable(property.returnMultiplicity, 'Derived property return multiplicity is missing');
  const derivedProperty = new MM_DerivedProperty(property.name, context.graph.getMultiplicity(property.returnMultiplicity.lowerBound, property.returnMultiplicity.upperBound), context.resolveGenericType(property.returnType), owner);
  derivedProperty.stereotypes = property.stereotypes.map(stereotype => context.resolveStereotype(stereotype)).filter(isNonNullable);
  derivedProperty.taggedValues = property.taggedValues.map(taggedValue => processTaggedValue(taggedValue, context)).filter(isNonNullable);
  derivedProperty.body = property.body;
  derivedProperty.parameters = property.parameters;
  return derivedProperty;
};

export const processAssociationProperty = (currentProperty: Property, associatedProperty: Property, context: GraphBuilderContext, pureAssociation: MM_Association): MM_Property => {
  const associatedPropertyClassType = guaranteeNonNullable(associatedProperty.type, 'Association associated property type is missing');
  const associatedClass = context.resolveClass(associatedPropertyClassType);
  const property = processProperty(currentProperty, context, pureAssociation);
  associatedClass.value.propertiesFromAssociations.push(property);
  return property;
};
