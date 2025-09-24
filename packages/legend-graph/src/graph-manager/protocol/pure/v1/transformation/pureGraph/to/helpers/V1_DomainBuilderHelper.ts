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
  UnsupportedOperationError,
  LogEvent,
} from '@finos/legend-shared';
import type { Class } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/Class.js';
import type { Association } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/Association.js';
import {
  type Measure,
  Unit,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/Measure.js';
import { Property } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/Property.js';
import { DerivedProperty } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/DerivedProperty.js';
import { RawVariableExpression } from '../../../../../../../../graph/metamodel/pure/rawValueSpecification/RawVariableExpression.js';
import { TaggedValue } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/TaggedValue.js';
import { Constraint } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/Constraint.js';
import type { BasicModel } from '../../../../../../../../graph/BasicModel.js';
import type {
  AbstractProperty,
  PropertyOwner,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/AbstractProperty.js';
import type { V1_ValueSpecification } from '../../../../model/valueSpecification/V1_ValueSpecification.js';
import {
  V1_buildFullPath,
  type V1_GraphBuilderContext,
} from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext.js';
import type { V1_Constraint } from '../../../../model/packageableElements/domain/V1_Constraint.js';
import type { V1_RawVariable } from '../../../../model/rawValueSpecification/V1_RawVariable.js';
import type { V1_Property } from '../../../../model/packageableElements/domain/V1_Property.js';
import type { V1_DerivedProperty } from '../../../../model/packageableElements/domain/V1_DerivedProperty.js';
import type { V1_Unit } from '../../../../model/packageableElements/domain/V1_Measure.js';
import type { V1_TaggedValue } from '../../../../model/packageableElements/domain/V1_TaggedValue.js';
import { V1_buildRawLambdaWithResolvedPaths } from './V1_ValueSpecificationPathResolver.js';
import {
  addElementToPackage,
  getAllClassDerivedProperties,
  getAllClassProperties,
  getOrCreateGraphPackage,
} from '../../../../../../../../graph/helpers/DomainHelper.js';
import { AggregationKind } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/AggregationKind.js';
import { GraphBuilderError } from '../../../../../../../GraphManagerUtils.js';
import type { V1_FunctionTestSuite } from '../../../../model/packageableElements/function/test/V1_FunctionTestSuite.js';
import { FunctionTestSuite } from '../../../../../../../../graph/metamodel/pure/packageableElements/function/test/FunctionTestSuite.js';
import type { V1_FunctionTestData } from '../../../../model/packageableElements/function/test/V1_FunctionTestData.js';
import { FunctionTestData } from '../../../../../../../../graph/metamodel/pure/packageableElements/function/test/FunctionTestData.js';
import { V1_buildEmbeddedData } from './V1_DataElementBuilderHelper.js';
import { V1_FunctionTest } from '../../../../model/packageableElements/function/test/V1_FunctionTest.js';
import {
  FunctionParameterValue,
  FunctionTest,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/function/test/FunctionTest.js';
import { V1_buildTestAssertion } from './V1_TestBuilderHelper.js';
import type { TestSuite } from '../../../../../../../../graph/metamodel/pure/test/Test.js';
import { DefaultValue } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/DefaultValue.js';
import { V1_getGenericTypeFullPath } from '../../../../helpers/V1_DomainHelper.js';

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
  assertNonNullable(
    variable.genericType,
    `Variable 'genericType' field is missing or empty`,
  );
  assertNonNullable(
    variable.multiplicity,
    `Variable 'multiplicity' field is missing`,
  );
  const multiplicity = context.graph.getMultiplicity(
    variable.multiplicity.lowerBound,
    variable.multiplicity.upperBound,
  );
  const type = context.resolveType(variable.genericType.rawType.fullPath);
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
  const path = V1_buildFullPath(unit.package, unit.name);
  assertTrue(
    !currentGraph.getOwnNullableElement(path),
    `Element '${path}' already exists`,
  );
  addElementToPackage(
    getOrCreateGraphPackage(currentGraph, unit.package, undefined),
    pureUnit,
  );
  currentGraph.setOwnType(path, pureUnit);
  return pureUnit;
};

const V1_extractPropertyAggregationKind = (val: string): AggregationKind => {
  if (!Object.values(AggregationKind).find((v) => v === val)) {
    throw new UnsupportedOperationError(
      `Can't handle unsupported property aggregation kind '${val}'`,
    );
  }
  return val as AggregationKind;
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
  assertNonNullable(
    property.genericType,
    `Property 'genericType' field is missing or empty`,
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
    context.resolveGenericType(V1_getGenericTypeFullPath(property.genericType)),
    owner,
  );
  pureProperty.aggregation = property.aggregation
    ? V1_extractPropertyAggregationKind(property.aggregation)
    : undefined;
  pureProperty.stereotypes = property.stereotypes
    .map((stereotype) => context.resolveStereotype(stereotype))
    .filter(isNonNullable);
  if (property.defaultValue) {
    const defautVal = new DefaultValue();
    defautVal.value = property.defaultValue.value;
    pureProperty.defaultValue = defautVal;
  }
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
  assertNonNullable(
    property.returnGenericType,
    `Derived property 'returnGenericType' field is missing or empty`,
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
    context.resolveGenericType(
      V1_getGenericTypeFullPath(property.returnGenericType),
    ),
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

/**
 * Validates the association property. If the association property is a system element
 * then it is invalid.
 */
const validateAssociationProperty = (
  association: Association,
  property: string,
  context: V1_GraphBuilderContext,
): void => {
  const systemClass = context.graph.systemModel.getOwnNullableClass(property);
  const sytemAssociation = context.graph.systemModel.getOwnNullableAssociation(
    association.path,
  );
  if (systemClass && !sytemAssociation) {
    const message = `Found system class property '${property}' in association '${association.path}'`;
    /**
     * In strict-mode, graph builder will consider this as an error
     * See https://github.com/finos/legend-studio/issues/941
     *
     * @discrepancy graph-building
     */
    if (context.options?.strict) {
      throw new GraphBuilderError(message);
    }
    context.logService.warn(LogEvent.create(message));
  }
};

export const V1_buildAssociationProperty = (
  currentProperty: V1_Property,
  associatedProperty: V1_Property,
  context: V1_GraphBuilderContext,
  pureAssociation: Association,
): Property => {
  const associatedPropertyClassType = V1_getGenericTypeFullPath(
    guaranteeNonNullable(
      associatedProperty.genericType,
      `Association associated property 'type' field is missing`,
    ),
  );
  validateAssociationProperty(
    pureAssociation,
    associatedPropertyClassType,
    context,
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
  // TODO?: C3 Linearzation
  let property = getAllClassProperties(parentClass).find(
    (p) => p.name === name,
  );
  if (property) {
    return property;
  }
  property = getAllClassDerivedProperties(parentClass).find((p) =>
    parameters
      ? isCompatibleDerivedProperty(p, name, parameters)
      : name === p.name,
  );
  return guaranteeNonNullable(
    property,
    `Property '${name}' not found in class '${parentClass.path}'`,
  );
};

// Function Suite
const V1_buildFunctionTest = (
  element: V1_FunctionTest,
  parentSuite: TestSuite,
  context: V1_GraphBuilderContext,
): FunctionTest => {
  const functionTest = new FunctionTest();
  functionTest.id = element.id;
  functionTest.__parent = parentSuite;
  functionTest.doc = element.doc;
  functionTest.assertions = element.assertions.map((assertion) =>
    V1_buildTestAssertion(assertion, functionTest, context),
  );
  functionTest.parameters = element.parameters?.map((param) => {
    const parameterValue = new FunctionParameterValue();
    parameterValue.name = param.name;
    parameterValue.value = param.value;
    return parameterValue;
  });
  return functionTest;
};

const V1_buildFunctionTestData = (
  element: V1_FunctionTestData,
  context: V1_GraphBuilderContext,
): FunctionTestData => {
  const storeTestData = new FunctionTestData();
  storeTestData.doc = element.doc;
  storeTestData.element = context.resolveStore(
    element.packageableElementPointer.path,
  );
  storeTestData.data = V1_buildEmbeddedData(element.data, context);
  return storeTestData;
};

export const V1_buildFunctionSuite = (
  element: V1_FunctionTestSuite,
  context: V1_GraphBuilderContext,
): FunctionTestSuite => {
  const functionSuite = new FunctionTestSuite();
  functionSuite.id = element.id;
  functionSuite.doc = element.doc;
  if (element.testData?.length) {
    functionSuite.testData = element.testData.map((e) =>
      V1_buildFunctionTestData(e, context),
    );
  }
  functionSuite.tests = element.tests.map((test) => {
    if (test instanceof V1_FunctionTest) {
      return V1_buildFunctionTest(test, functionSuite, context);
    }
    throw new UnsupportedOperationError(
      'Unable to build function test: Unsupported function test type',
    );
  });
  return functionSuite;
};
