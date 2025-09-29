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
import type { ConcreteFunctionDefinition } from '../../../../../../../graph/metamodel/pure/packageableElements/function/ConcreteFunctionDefinition.js';
import type { Property } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Property.js';
import {
  V1_Profile,
  V1_ProfileStereotype,
  V1_ProfileTag,
} from '../../../model/packageableElements/domain/V1_Profile.js';
import { V1_StereotypePtr } from '../../../model/packageableElements/domain/V1_StereotypePtr.js';
import {
  V1_initPackageableElement,
  V1_transformElementReferencePointer,
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
import {
  V1_RawGenericType,
  V1_RawRawType,
  type V1_RawVariable,
} from '../../../model/rawValueSpecification/V1_RawVariable.js';
import type { V1_GraphTransformerContext } from './V1_GraphTransformerContext.js';
import { isStubbed_RawLambda } from '../../../../../../../graph/helpers/creator/RawValueSpecificationCreatorHelper.js';
import type { FunctionTestSuite } from '../../../../../../../graph/metamodel/pure/packageableElements/function/test/FunctionTestSuite.js';
import { V1_FunctionTestSuite } from '../../../model/packageableElements/function/test/V1_FunctionTestSuite.js';
import { FunctionTest } from '../../../../../../../graph/metamodel/pure/packageableElements/function/test/FunctionTest.js';
import {
  V1_FunctionParameterValue,
  V1_FunctionTest,
} from '../../../model/packageableElements/function/test/V1_FunctionTest.js';
import { UnsupportedOperationError } from '@finos/legend-shared';
import { V1_FunctionTestData } from '../../../model/packageableElements/function/test/V1_FunctionTestData.js';
import { V1_transformEmbeddedData } from './V1_DataElementTransformer.js';
import { V1_transformTestAssertion } from './V1_TestTransformer.js';
import { V1_DefaultValue } from '../../../model/packageableElements/domain/V1_DefaultValue.js';
import { PackageableElementPointerType } from '../../../../../../../graph/MetaModelConst.js';
import {
  V1_createGenericTypeWithElementPath,
  V1_createRelationTypeColumnWithGenericType,
} from '../../../helpers/V1_DomainHelper.js';
import { V1_PackageableElementPointer } from '../../../model/packageableElements/V1_PackageableElement.js';
import type { GenericType } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/GenericType.js';
import { V1_GenericType } from '../../../model/packageableElements/type/V1_GenericType.js';
import type { V1_Type } from '../../../model/packageableElements/type/V1_Type.js';
import { RelationType } from '../../../../../../../graph/metamodel/pure/packageableElements/relation/RelationType.js';
import { V1_PackageableType } from '../../../model/packageableElements/type/V1_PackageableType.js';
import type { Type } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Type.js';
import { V1_RelationType } from '../../../model/packageableElements/type/V1_RelationType.js';
import { V1_transformRootValueSpecification } from './V1_ValueSpecificationTransformer.js';

export const V1_createGenericType = (
  genericType: GenericType,
): V1_GenericType => {
  const v1Type = V1_transformGenericType_Type(genericType.rawType);
  const protocolGenType = new V1_GenericType();
  protocolGenType.rawType = v1Type;
  const typeArguments = genericType.typeArguments ?? [];
  protocolGenType.typeArguments = typeArguments.map((t) =>
    V1_createGenericType(t.value),
  );
  protocolGenType.typeVariableValues =
    genericType.typeVariableValues?.map((v) =>
      V1_transformRootValueSpecification(v),
    ) ?? [];
  return protocolGenType;
};

export function V1_transformGenericType_Type(type: Type): V1_Type {
  if (type instanceof RelationType) {
    return V1_transformGenericType_RelationType(type);
  }
  const pType = new V1_PackageableType();
  pType.fullPath = type.path;
  return pType;
}

export function V1_transformGenericType_RelationType(
  path: RelationType,
): V1_RelationType {
  const genType = new V1_RelationType();
  genType.columns = path.columns.map((col) =>
    V1_createRelationTypeColumnWithGenericType(
      col.name,
      V1_createGenericType(col.genericType.value),
      col.multiplicity,
    ),
  );
  return genType;
}

export function V1_createGenericTypeWithRawType(type: V1_Type): V1_GenericType {
  const genType = new V1_GenericType();
  genType.rawType = type;
  return genType;
}

export const V1_createRawGenericTypeWithElementPath = (
  path: string,
): V1_RawGenericType => {
  const genType = new V1_RawGenericType();
  const pType = new V1_RawRawType();
  pType.fullPath = path;
  genType.rawType = pType;
  return genType;
};

export const V1_transformProfile = (element: Profile): V1_Profile => {
  const profile = new V1_Profile();
  V1_initPackageableElement(profile, element);
  profile.stereotypes = element.p_stereotypes.map(
    (s) => new V1_ProfileStereotype(s.value),
  );
  profile.tags = element.p_tags.map((t) => new V1_ProfileTag(t.value));
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
  property.genericType = V1_createGenericTypeWithElementPath(
    element.genericType.ownerReference.valueForSerialization ?? '',
  );
  property.aggregation = element.aggregation;
  if (element.defaultValue) {
    const defaultVal = new V1_DefaultValue();
    defaultVal.value = element.defaultValue.value;
    property.defaultValue = defaultVal;
  }
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
  derivedProperty.returnGenericType = V1_createGenericTypeWithElementPath(
    element.genericType.ownerReference.valueForSerialization ?? '',
  );

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
    (e) =>
      new V1_PackageableElementPointer(
        PackageableElementPointerType.CLASS,
        e.ownerReference.valueForSerialization ?? '',
      ),
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

const V1_transformFunctionTest = (element: FunctionTest): V1_FunctionTest => {
  const functionTest = new V1_FunctionTest();
  functionTest.id = element.id;
  functionTest.doc = element.doc;
  functionTest.assertions = element.assertions.map((assertion) =>
    V1_transformTestAssertion(assertion),
  );
  functionTest.parameters = element.parameters?.map((p) => {
    const parameterValue = new V1_FunctionParameterValue();
    parameterValue.name = p.name;
    parameterValue.value = p.value;
    return parameterValue;
  });
  return functionTest;
};

const V1_transformFunctionSuite = (
  element: FunctionTestSuite,
  context: V1_GraphTransformerContext,
): V1_FunctionTestSuite => {
  const testSuite = new V1_FunctionTestSuite();
  testSuite.id = element.id;
  testSuite.doc = element.doc;
  if (element.testData?.length) {
    testSuite.testData = element.testData.map((elementData) => {
      const pTestData = new V1_FunctionTestData();
      pTestData.doc = elementData.doc;
      pTestData.packageableElementPointer = V1_transformElementReferencePointer(
        undefined,
        elementData.element,
      );
      pTestData.data = V1_transformEmbeddedData(elementData.data, context);
      return pTestData;
    });
  }
  testSuite.tests = element.tests.map((el) => {
    if (el instanceof FunctionTest) {
      return V1_transformFunctionTest(el);
    }
    throw new UnsupportedOperationError(
      'Unsupported function test to transform',
    );
  });
  return testSuite;
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
  _function.returnGenericType = V1_createGenericType(element.returnType.value);
  _function.stereotypes = element.stereotypes.map(V1_transformStereotype);
  _function.taggedValues = element.taggedValues.map(V1_transformTaggedValue);
  _function.returnMultiplicity = V1_transformMultiplicity(
    element.returnMultiplicity,
  );
  if (element.tests.length) {
    _function.tests = element.tests.map((suite) =>
      V1_transformFunctionSuite(suite, context),
    );
  }
  return _function;
};
