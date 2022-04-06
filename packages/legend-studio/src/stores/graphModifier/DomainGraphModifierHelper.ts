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

import { addUniqueEntry, changeEntry, deleteEntry } from '@finos/legend-shared';
import { action } from 'mobx';
import {
  type GenericTypeReference,
  type TaggedValue,
  type StereotypeReference,
  type GenericType,
  type Type,
  type Multiplicity,
  type PropertyReference,
  type Stereotype,
  type Tag,
  type PackageableElement,
  type PackageableElementReference,
  type AbstractProperty,
  type AnnotatedElement,
  type Class,
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
  Association,
  _package_addElement,
  _package_deleteElement,
} from '@finos/legend-graph';

// --------------------------------------------- PackageableElementReference -------------------------------------

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
    addUniqueEntry(_class.properties, val);
  },
);

export const class_deleteDerivedProperty = action(
  (_class: Class, val: DerivedProperty): void => {
    deleteEntry(_class.derivedProperties, val);
  },
);
export const class_addDerivedProperty = action(
  (_class: Class, val: DerivedProperty): void => {
    addUniqueEntry(_class.derivedProperties, val);
  },
);
export const class_addContraint = action(
  (_class: Class, val: Constraint): void => {
    addUniqueEntry(_class.constraints, val);
  },
);
export const class_deleteConstraint = action(
  (_class: Class, val: Constraint): void => {
    deleteEntry(_class.constraints, val);
  },
);
export const class_changeConstraint = action(
  (_class: Class, val: Constraint, newVal: Constraint): void => {
    changeEntry(_class.constraints, val, newVal);
  },
);
export const class_addSuperType = action(
  (_class: Class, val: GenericTypeReference): void => {
    addUniqueEntry(_class.generalizations, val);
  },
);
export const class_deleteSuperType = action(
  (_class: Class, val: GenericTypeReference): void => {
    deleteEntry(_class.generalizations, val);
  },
);
export const class_addSubclass = action((_class: Class, val: Class): void => {
  addUniqueEntry(_class.subclasses, val);
});
export const class_deleteSubclass = action(
  (_class: Class, val: Class): void => {
    deleteEntry(_class.subclasses, val);
  },
);

// --------------------------------------------- GenericTypeReference -------------------------------------

export const setGenericTypeReferenceValue = action(
  (gen: GenericTypeReference, value: GenericType): void => {
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
    setGenericTypeReferenceValue(_property.genericType, value);
  },
);
export const property_setMultiplicity = action(
  (_property: Property | DerivedProperty, value: Multiplicity): void => {
    _property.multiplicity = value;
  },
);
export const property_setReferenceValue = action(
  (pV: PropertyReference, value: AbstractProperty): void => {
    pV.value = value;
    packageableElementReference_setValue(
      pV.ownerReference,
      value.owner instanceof Association
        ? value.owner.getPropertyAssociatedClass(pV.value)
        : value.owner,
    );
  },
);
export const stereotypeReference_setValue = action(
  (sV: StereotypeReference, value: Stereotype): void => {
    sV.value = value;
    packageableElementReference_setValue(sV.ownerReference, value.owner);
  },
);

// --------------------------------------------- AnnotatedElement -------------------------------------

export const annotatedElement_addTaggedValue = action(
  (annotatedElement: AnnotatedElement, value: TaggedValue): void => {
    addUniqueEntry(annotatedElement.taggedValues, value);
  },
);
export const annotatedElement_deleteTaggedValue = action(
  (_property: AnnotatedElement, value: TaggedValue): void => {
    deleteEntry(_property.taggedValues, value);
  },
);
export const annotatedElement_addStereotype = action(
  (annotatedElement: AnnotatedElement, value: StereotypeReference): void => {
    addUniqueEntry(annotatedElement.stereotypes, value);
  },
);
export const annotatedElement_changeStereotype = action(
  (
    annotatedElement: AnnotatedElement,
    oldValue: StereotypeReference,
    newValue: StereotypeReference,
  ): void => {
    changeEntry(annotatedElement.stereotypes, oldValue, newValue);
  },
);
export const annotatedElement_deleteStereotype = action(
  (annotatedElement: AnnotatedElement, value: StereotypeReference): void => {
    deleteEntry(annotatedElement.stereotypes, value);
  },
);

export const taggedValue_setTag = action(
  (taggedValue: TaggedValue, value: Tag): void => {
    taggedValue.tag.value = value;
    taggedValue.tag.ownerReference.value = value.owner;
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
    _constraint.functionDefinition = lambda;
  },
);

// --------------------------------------------- Profile -------------------------------------

export const profile_addTag = action((profile: Profile, value: Tag): void => {
  addUniqueEntry(profile.tags, value);
});
export const profile_deleteTag = action(
  (profile: Profile, value: Tag): void => {
    deleteEntry(profile.tags, value);
  },
);
export const profile_addStereotype = action(
  (profile: Profile, value: Stereotype): void => {
    addUniqueEntry(profile.stereotypes, value);
  },
);
export const profile_deleteStereotype = action(
  (profile: Profile, value: Stereotype): void => {
    deleteEntry(profile.stereotypes, value);
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
    addUniqueEntry(_func.parameters, val);
  },
);
export const function_setReturnType = action(
  (_func: ConcreteFunctionDefinition, val: Type): void => {
    packageableElementReference_setValue(_func.returnType, val);
  },
);
export const functio_setReturnMultiplicity = action(
  (_func: ConcreteFunctionDefinition, val: Multiplicity): void => {
    _func.returnMultiplicity = val;
  },
);

// --------------------------------------------- Enumeration -------------------------------------

export const enum_setName = action((val: Enum, value: string): void => {
  val.name = value;
});
export const enum_addValue = action(
  (enumeration: Enumeration, value: Enum): void => {
    addUniqueEntry(enumeration.values, value);
  },
);
export const enum_deleteValue = action(
  (enumeration: Enumeration, value: Enum): void => {
    deleteEntry(enumeration.values, value);
  },
);
export const enumValueReference_setValue = action(
  (ref: EnumValueReference, value: Enum): void => {
    ref.value = value;
    packageableElementReference_setValue(ref.ownerReference, value.owner);
  },
);

// --------------------------------------------- Measure -------------------------------------

export const measure_setCanonicalUnit = action(
  (_measure: Measure, unit: Unit): void => {
    _measure.canonicalUnit = unit;
  },
);
export const unit_setConversionFunction = action(
  (unit: Unit, lambda: RawLambda): void => {
    unit.conversionFunction = lambda;
  },
);

// ------------------------------------------ Package -------------------------------------

export const package_addElement = action(_package_addElement);
export const package_deleteElement = action(_package_deleteElement);
