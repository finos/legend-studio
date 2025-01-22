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
  addUniqueEntry,
  assertTrue,
  deleteEntry,
  guaranteeType,
  swapEntry,
  type PlainObject,
} from '@finos/legend-shared';
import { action } from 'mobx';
import {
  type GenericTypeReference,
  type TaggedValue,
  type StereotypeReference,
  type Type,
  type Multiplicity,
  type Stereotype,
  type Tag,
  type PackageableElement,
  type PackageableElementReference,
  type AnnotatedElement,
  type Property,
  type DerivedProperty,
  type Constraint,
  type Profile,
  type RawVariableExpression,
  type ConcreteFunctionDefinition,
  type Enum,
  type Enumeration,
  type EnumValueReference,
  type Measure,
  type Unit,
  type RawLambda,
  type Association,
  type INTERNAL__UnknownFunctionActivator,
  type FunctionStoreTestData,
  type ObserverContext,
  type FunctionParameterValue,
  type FunctionTest,
  type FunctionTestSuite,
  type AggregationKind,
  type EmbeddedData,
  GenericType,
  Class,
  observe_Enum,
  observe_DerivedProperty,
  observe_GenericTypeReference,
  observe_Property,
  observe_RawVariableExpression,
  observe_Stereotype,
  observe_StereotypeReference,
  observe_Tag,
  observe_TaggedValue,
  observe_Constraint,
  observe_GenericType,
  observe_Type,
  observe_Unit,
  observe_RawLambda,
  isStubbed_PackageableElement,
  getOtherAssociatedProperty,
  observe_EmbeddedData,
  observe_FunctionTestSuite,
  observe_FunctionParameterValue,
} from '@finos/legend-graph';

// --------------------------------------------- Packageable Element -------------------------------------

export const packageableElementReference_setValue = action(
  <T extends PackageableElement>(
    ref: PackageableElementReference<T>,
    value: T,
  ): void => {
    ref.value = value;
  },
);

// --------------------------------------------- Class -------------------------------------

export const class_deleteProperty = action(
  (_class: Class, val: Property): void => {
    deleteEntry(_class.properties, val);
  },
);
export const class_addProperty = action(
  (_class: Class, val: Property): void => {
    addUniqueEntry(_class.properties, observe_Property(val));
  },
);

export const class_swapProperties = action(
  (_class: Class, sourceProperty: Property, targetProperty: Property): void => {
    swapEntry(_class.properties, sourceProperty, targetProperty);
  },
);

export const class_deleteDerivedProperty = action(
  (_class: Class, val: DerivedProperty): void => {
    deleteEntry(_class.derivedProperties, val);
  },
);
export const class_addDerivedProperty = action(
  (_class: Class, val: DerivedProperty): void => {
    addUniqueEntry(_class.derivedProperties, observe_DerivedProperty(val));
  },
);

export const class_swapDerivedProperties = action(
  (
    _class: Class,
    sourceProperty: DerivedProperty,
    targetProperty: DerivedProperty,
  ): void => {
    swapEntry(_class.derivedProperties, sourceProperty, targetProperty);
  },
);

export const class_addContraint = action(
  (_class: Class, val: Constraint): void => {
    addUniqueEntry(_class.constraints, observe_Constraint(val));
  },
);
export const class_deleteConstraint = action(
  (_class: Class, val: Constraint): void => {
    deleteEntry(_class.constraints, val);
  },
);
export const class_swapConstraints = action(
  (
    _class: Class,
    sourceConstraint: Constraint,
    targetConstraint: Constraint,
  ): void => {
    swapEntry(_class.constraints, sourceConstraint, targetConstraint);
  },
);

export const class_addSuperType = action(
  (_class: Class, val: GenericTypeReference): void => {
    addUniqueEntry(_class.generalizations, observe_GenericTypeReference(val));
  },
);
export const class_deleteSuperType = action(
  (_class: Class, val: GenericTypeReference): void => {
    deleteEntry(_class.generalizations, val);
  },
);
export const class_swapSuperTypes = action(
  (
    _class: Class,
    sourceSuperType: GenericTypeReference,
    targetSuperType: GenericTypeReference,
  ): void => {
    swapEntry(_class.generalizations, sourceSuperType, targetSuperType);
  },
);
export const class_addSubclass = action((_class: Class, val: Class): void => {
  addUniqueEntry(_class._subclasses, val);
});
export const class_deleteSubclass = action(
  (_class: Class, val: Class): void => {
    deleteEntry(_class._subclasses, val);
  },
);

// --------------------------------------------- GenericTypeReference -------------------------------------

export const setGenericTypeReferenceValue = action(
  (gen: GenericTypeReference, value: GenericType): void => {
    observe_GenericTypeReference(gen);
    observe_GenericType(value);
    gen.value = value;
    gen.ownerReference.value = value.rawType;
  },
);

// --------------------------------------------- Property ------------------------------------------------

export const property_setName = action(
  (_property: Property | DerivedProperty, value: string): void => {
    _property.name = value;
  },
);
export const property_setGenericType = action(
  (_property: Property | DerivedProperty, value: GenericType): void => {
    setGenericTypeReferenceValue(
      _property.genericType,
      observe_GenericType(value),
    );
  },
);
export const property_setMultiplicity = action(
  (_property: Property | DerivedProperty, value: Multiplicity): void => {
    _property.multiplicity = value;
  },
);
export const property_setAggregationKind = action(
  (target: Property, value: AggregationKind | undefined): void => {
    target.aggregation = value;
  },
);
export const stereotypeReference_setValue = action(
  (sV: StereotypeReference, value: Stereotype): void => {
    sV.value = observe_Stereotype(value);
    packageableElementReference_setValue(sV.ownerReference, value._OWNER);
  },
);

// --------------------------------------------- AnnotatedElement -------------------------------------

export const annotatedElement_addTaggedValue = action(
  (annotatedElement: AnnotatedElement, value: TaggedValue): void => {
    addUniqueEntry(annotatedElement.taggedValues, observe_TaggedValue(value));
  },
);
export const annotatedElement_deleteTaggedValue = action(
  (_property: AnnotatedElement, value: TaggedValue): void => {
    deleteEntry(_property.taggedValues, value);
  },
);
export const annotatedElement_addStereotype = action(
  (annotatedElement: AnnotatedElement, value: StereotypeReference): void => {
    addUniqueEntry(
      annotatedElement.stereotypes,
      observe_StereotypeReference(value),
    );
  },
);
export const annotatedElement_deleteStereotype = action(
  (annotatedElement: AnnotatedElement, value: StereotypeReference): void => {
    deleteEntry(annotatedElement.stereotypes, value);
  },
);

export const taggedValue_setTag = action(
  (taggedValue: TaggedValue, value: Tag): void => {
    taggedValue.tag.value = observe_Tag(value);
    taggedValue.tag.ownerReference.value = value._OWNER;
  },
);

export const taggedValue_setValue = action(
  (val: TaggedValue, value: string): void => {
    val.value = value;
  },
);
export const tagStereotype_setValue = action(
  (_tag: Tag | Stereotype, value: string): void => {
    _tag.value = value;
  },
);

export const annotatedElement_swapTaggedValues = action(
  (
    annotatedElement: AnnotatedElement,
    sourceTaggedValue: TaggedValue,
    targetTaggedValue: TaggedValue,
  ): void => {
    swapEntry(
      annotatedElement.taggedValues,
      sourceTaggedValue,
      targetTaggedValue,
    );
  },
);

export const annotatedElement_swapStereotypes = action(
  (
    annotatedElement: AnnotatedElement,
    sourceStereotype: StereotypeReference,
    targetStereotype: StereotypeReference,
  ): void => {
    swapEntry(annotatedElement.stereotypes, sourceStereotype, targetStereotype);
  },
);

// --------------------------------------------- DerivedProperty -------------------------------------

export const derivedProperty_setBody = (
  dp: DerivedProperty,
  value: object | undefined,
): void => {
  dp.body = value;
};
export const derivedProperty_setParameters = (
  dp: DerivedProperty,
  value: object | undefined,
): void => {
  dp.parameters = value;
};

// --------------------------------------------- Constraint -------------------------------------

export const constraint_setName = action(
  (_constraint: Constraint, name: string): void => {
    _constraint.name = name;
  },
);
export const constraint_setFunctionDefinition = action(
  (_constraint: Constraint, lambda: RawLambda): void => {
    _constraint.functionDefinition = observe_RawLambda(lambda);
  },
);

// --------------------------------------------- Profile -------------------------------------

export const profile_addTag = action((profile: Profile, value: Tag): void => {
  addUniqueEntry(profile.p_tags, observe_Tag(value));
});
export const profile_deleteTag = action(
  (profile: Profile, value: Tag): void => {
    deleteEntry(profile.p_tags, value);
  },
);
export const profile_addStereotype = action(
  (profile: Profile, value: Stereotype): void => {
    addUniqueEntry(profile.p_stereotypes, observe_Stereotype(value));
  },
);
export const profile_deleteStereotype = action(
  (profile: Profile, value: Stereotype): void => {
    deleteEntry(profile.p_stereotypes, value);
  },
);

export const profile_swapTags = action(
  (profile: Profile, sourceTag: Tag, targetTag: Tag): void => {
    swapEntry(profile.p_tags, sourceTag, targetTag);
  },
);

export const profile_swapStereotypes = action(
  (
    profile: Profile,
    sourceStereotype: Stereotype,
    targetStereotype: Stereotype,
  ): void => {
    swapEntry(profile.p_stereotypes, sourceStereotype, targetStereotype);
  },
);

// --------------------------------------------- Function -------------------------------------

export const function_deleteParameter = action(
  (_func: ConcreteFunctionDefinition, val: RawVariableExpression): void => {
    deleteEntry(_func.parameters, val);
  },
);
export const function_addParameter = action(
  (_func: ConcreteFunctionDefinition, val: RawVariableExpression): void => {
    addUniqueEntry(_func.parameters, observe_RawVariableExpression(val));
  },
);
export const function_setReturnGenericType = action(
  (_func: ConcreteFunctionDefinition, val: GenericType): void => {
    setGenericTypeReferenceValue(_func.returnType, observe_GenericType(val));
  },
);
export const function_setReturnMultiplicity = action(
  (_func: ConcreteFunctionDefinition, val: Multiplicity): void => {
    _func.returnMultiplicity = val;
  },
);

export const function_swapParameters = action(
  (
    _func: ConcreteFunctionDefinition,
    sourceParameter: RawVariableExpression,
    targetParameter: RawVariableExpression,
  ): void => {
    swapEntry(_func.parameters, sourceParameter, targetParameter);
  },
);

export const INTERNAL__UnknownFunctionActivator_setContent = action(
  (metamodel: INTERNAL__UnknownFunctionActivator, val: PlainObject) => {
    metamodel.content = val;
  },
);

export const functionTestable_setEmbeddedData = action(
  (
    store: FunctionStoreTestData,
    embeddedData: EmbeddedData,
    observerContext: ObserverContext,
  ): void => {
    store.data = observe_EmbeddedData(embeddedData, observerContext);
  },
);

export const functionTestable_deleteDataStore = action(
  (suite: FunctionTestSuite, val: FunctionStoreTestData): void => {
    deleteEntry(suite.testData ?? [], val);
  },
);

export const function_addTestSuite = action(
  (
    _func: ConcreteFunctionDefinition,
    val: FunctionTestSuite,
    context: ObserverContext,
  ): void => {
    addUniqueEntry(_func.tests, observe_FunctionTestSuite(val, context));
  },
);

export const function_setParameterValueSpec = action(
  (parameterValue: FunctionParameterValue, val: object) => {
    parameterValue.value = val;
  },
);

export const function_setParameterValues = action(
  (test: FunctionTest, values: FunctionParameterValue[]) => {
    test.parameters = values.map(observe_FunctionParameterValue);
  },
);

export const function_deleteParameterValue = action(
  (test: FunctionTest, value: FunctionParameterValue) => {
    deleteEntry(test.parameters ?? [], value);
  },
);

export const function_addParameterValue = action(
  (test: FunctionTest, value: FunctionParameterValue) => {
    if (test.parameters) {
      test.parameters.push(observe_FunctionParameterValue(value));
    } else {
      test.parameters = [observe_FunctionParameterValue(value)];
    }
  },
);

export const function_setParameterName = action(
  (parameterValue: FunctionParameterValue, val: string) => {
    parameterValue.name = val;
  },
);

// --------------------------------------------- Enumeration -------------------------------------

export const enum_setName = action((val: Enum, value: string): void => {
  val.name = value;
});
export const enum_addValue = action(
  (enumeration: Enumeration, value: Enum): void => {
    addUniqueEntry(enumeration.values, observe_Enum(value));
  },
);
export const enum_deleteValue = action(
  (enumeration: Enumeration, value: Enum): void => {
    deleteEntry(enumeration.values, value);
  },
);
export const enum_swapValues = action(
  (enumeration: Enumeration, sourceEnum: Enum, targetEnum: Enum): void => {
    swapEntry(enumeration.values, sourceEnum, targetEnum);
  },
);
export const enumValueReference_setValue = action(
  (ref: EnumValueReference, value: Enum): void => {
    ref.value = observe_Enum(value);
    packageableElementReference_setValue(ref.ownerReference, value._OWNER);
  },
);

// --------------------------------------------- Association -------------------------------------

export const association_changePropertyType = action(
  (association: Association, property: Property, type: Class): void => {
    const otherProperty = getOtherAssociatedProperty(association, property);
    // remove other property from current parent class of the to-be-changed property
    const otherPropertyAssociatedClass = guaranteeType(
      property.genericType.ownerReference.value,
      Class,
      `Association property '${property.name}' must be of type 'class'`,
    );
    // don't invoke deletion if the class is a stub (otherProperty is not present)
    if (!isStubbed_PackageableElement(otherPropertyAssociatedClass)) {
      assertTrue(
        deleteEntry(
          otherPropertyAssociatedClass.propertiesFromAssociations,
          otherProperty,
        ),
        `Can't find property '${otherProperty.name}' from association '${association.path}' in associated class '${otherPropertyAssociatedClass.path}'`,
      );
    }
    // set up the relationship between the other property and the new class
    addUniqueEntry(type.propertiesFromAssociations, otherProperty);
    // set new type for the property
    const _genType = new GenericType(type);
    property.genericType.value = _genType;
    property.genericType.ownerReference.value = _genType.rawType;
  },
);

// --------------------------------------------- Measure -------------------------------------

export const measure_setCanonicalUnit = action(
  (_measure: Measure, unit: Unit): void => {
    _measure.canonicalUnit = observe_Unit(unit);
  },
);
export const unit_setConversionFunction = action(
  (unit: Unit, lambda: RawLambda): void => {
    unit.conversionFunction = observe_RawLambda(lambda);
  },
);
