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
import type { AbstractProperty } from './metamodels/pure/packageableElements/domain/AbstractProperty';
import type { AnnotatedElement } from './metamodels/pure/packageableElements/domain/AnnotatedElement';
import { Association } from './metamodels/pure/packageableElements/domain/Association';
import type { Class } from './metamodels/pure/packageableElements/domain/Class';
import type { ConcreteFunctionDefinition } from './metamodels/pure/packageableElements/domain/ConcreteFunctionDefinition';
import type { Constraint } from './metamodels/pure/packageableElements/domain/Constraint';
import type { DerivedProperty } from './metamodels/pure/packageableElements/domain/DerivedProperty';
import type { Enum } from './metamodels/pure/packageableElements/domain/Enum';
import type { Enumeration } from './metamodels/pure/packageableElements/domain/Enumeration';
import type { EnumValueReference } from './metamodels/pure/packageableElements/domain/EnumValueReference';
import type { GenericType } from './metamodels/pure/packageableElements/domain/GenericType';
import type { GenericTypeReference } from './metamodels/pure/packageableElements/domain/GenericTypeReference';
import type {
  Measure,
  Unit,
} from './metamodels/pure/packageableElements/domain/Measure';
import type { Multiplicity } from './metamodels/pure/packageableElements/domain/Multiplicity';
import type { Package } from './metamodels/pure/packageableElements/domain/Package';
import type { Profile } from './metamodels/pure/packageableElements/domain/Profile';
import type { Property } from './metamodels/pure/packageableElements/domain/Property';
import type { PropertyReference } from './metamodels/pure/packageableElements/domain/PropertyReference';
import type { Stereotype } from './metamodels/pure/packageableElements/domain/Stereotype';
import type { StereotypeReference } from './metamodels/pure/packageableElements/domain/StereotypeReference';
import type { Tag } from './metamodels/pure/packageableElements/domain/Tag';
import type { TaggedValue } from './metamodels/pure/packageableElements/domain/TaggedValue';
import type { TagReference } from './metamodels/pure/packageableElements/domain/TagReference';
import type { Type } from './metamodels/pure/packageableElements/domain/Type';
import type { PackageableElement } from './metamodels/pure/packageableElements/PackageableElement';
import type { PackageableElementReference } from './metamodels/pure/packageableElements/PackageableElementReference';
import type { RawLambda } from './metamodels/pure/rawValueSpecification/RawLambda';
import type { RawVariableExpression } from './metamodels/pure/rawValueSpecification/RawVariableExpression';

// PackageableElementReference
export const setPackageableElementReferenceValue = action(
  <T extends PackageableElement>(
    ref: PackageableElementReference<T>,
    value: T,
  ): void => {
    ref.value = value;
  },
);
// Class
export const deleteClassProperty = action(
  (_class: Class, val: Property): void => {
    deleteEntry(_class.properties, val);
  },
);
export const addClassProperty = action((_class: Class, val: Property): void => {
  addUniqueEntry(_class.properties, val);
});

export const deleteClassDerivedProperty = action(
  (_class: Class, val: DerivedProperty): void => {
    deleteEntry(_class.derivedProperties, val);
  },
);
export const addClassDerivedProperty = action(
  (_class: Class, val: DerivedProperty): void => {
    addUniqueEntry(_class.derivedProperties, val);
  },
);
export const addClassConstraint = action(
  (_class: Class, val: Constraint): void => {
    addUniqueEntry(_class.constraints, val);
  },
);
export const deleteClassConstraint = action(
  (_class: Class, val: Constraint): void => {
    deleteEntry(_class.constraints, val);
  },
);
export const changeClassConstraint = action(
  (_class: Class, val: Constraint, newVal: Constraint): void => {
    changeEntry(_class.constraints, val, newVal);
  },
);
export const addClassSuperType = action(
  (_class: Class, val: GenericTypeReference): void => {
    addUniqueEntry(_class.generalizations, val);
  },
);
export const deleteClassSuperType = action(
  (_class: Class, val: GenericTypeReference): void => {
    deleteEntry(_class.generalizations, val);
  },
);
export const addClassSubclass = action((_class: Class, val: Class): void => {
  addUniqueEntry(_class.subclasses, val);
});
export const deleteClassSubclass = action((_class: Class, val: Class): void => {
  deleteEntry(_class.subclasses, val);
});
export const deleteClassTaggedValue = action(
  (_class: Class, val: TaggedValue): void => {
    deleteEntry(_class.taggedValues, val);
  },
);
export const addClassTaggedValue = action(
  (_class: Class, val: TaggedValue): void => {
    addUniqueEntry(_class.taggedValues, val);
  },
);
export const deleteClassStereotype = action(
  (_class: Class, val: StereotypeReference): void => {
    deleteEntry(_class.stereotypes, val);
  },
);
export const changeClassStereotype = action(
  (
    _class: Class,
    oldVal: StereotypeReference,
    newVal: StereotypeReference,
  ): void => {
    changeEntry(_class.stereotypes, oldVal, newVal);
  },
);

export const addClassStereotype = action(
  (_class: Class, val: StereotypeReference): void => {
    addUniqueEntry(_class.stereotypes, val);
  },
);

// GenericTypeReference
export const setGenericTypeReferenceValue = action(
  (gen: GenericTypeReference, value: GenericType): void => {
    gen.value = value;
    setPackageableElementReferenceValue(gen.ownerReference, value.rawType);
  },
);

export const setGenericTypeRawType = action(
  (genericType: GenericType, type: Type): void => {
    genericType.rawType = type;
  },
);

// Property
export const setPropertyName = action(
  (_property: Property | DerivedProperty, value: string): void => {
    _property.name = value;
  },
);
export const setPropertyGenericType = action(
  (_property: Property | DerivedProperty, value: GenericType): void => {
    setGenericTypeReferenceValue(_property.genericType, value);
  },
);
export const setPropertyMultiplicity = action(
  (_property: Property | DerivedProperty, value: Multiplicity): void => {
    _property.multiplicity = value;
  },
);
export const setPropertyReferenceValue = action(
  (pV: PropertyReference, value: AbstractProperty): void => {
    pV.value = value;
    setPackageableElementReferenceValue(
      pV.ownerReference,
      value.owner instanceof Association
        ? value.owner.getPropertyAssociatedClass(pV.value)
        : value.owner,
    );
  },
);
export const setStereotypeReferenceValue = action(
  (sV: StereotypeReference, value: Stereotype): void => {
    sV.value = value;
    setPackageableElementReferenceValue(sV.ownerReference, value.owner);
  },
);
export const setTagReferenceValue = (tV: TagReference, value: Tag): void => {
  tV.value = value;
  setPackageableElementReferenceValue(tV.ownerReference, value.owner);
};
// AnnotatedElement
export const addTaggedValue = action(
  (annotatedElement: AnnotatedElement, value: TaggedValue): void => {
    addUniqueEntry(annotatedElement.taggedValues, value);
  },
);
export const deleteTaggedValue = action(
  (_property: AnnotatedElement, value: TaggedValue): void => {
    deleteEntry(_property.taggedValues, value);
  },
);
export const addStereotype = action(
  (annotatedElement: AnnotatedElement, value: StereotypeReference): void => {
    addUniqueEntry(annotatedElement.stereotypes, value);
  },
);
export const changePropertyStereotype = action(
  (
    annotatedElement: AnnotatedElement,
    oldValue: StereotypeReference,
    newValue: StereotypeReference,
  ): void => {
    changeEntry(annotatedElement.stereotypes, oldValue, newValue);
  },
);
export const deleteStereotype = action(
  (annotatedElement: AnnotatedElement, value: StereotypeReference): void => {
    deleteEntry(annotatedElement.stereotypes, value);
  },
);

export const setTag = action((val: TaggedValue, tag: Tag): void => {
  setTagReferenceValue(val.tag, tag);
});

export const setTaggedValueValue = action(
  (val: TaggedValue, value: string): void => {
    val.value = value;
  },
);

export const setTagStereotypeValue = action(
  (_tag: Tag | Stereotype, value: string): void => {
    _tag.value = value;
  },
);

// DerivedProperty
export const setDerivedPropertyBody = (
  dp: DerivedProperty,
  value: object | undefined,
): void => {
  dp.body = value;
};
export const setDerivedPropertyParameters = (
  dp: DerivedProperty,
  value: object | undefined,
): void => {
  dp.parameters = value;
};
// Multiplicity
export const setMultiplicityLowerBound = action(
  (_m: Multiplicity, val: number): void => {
    _m.lowerBound = val;
  },
);
export const setMultiplicityUpperBound = action(
  (_m: Multiplicity, val: number | undefined): void => {
    _m.upperBound = val;
  },
);

// Constraint
export const setConstraintName = action(
  (_constraint: Constraint, name: string): void => {
    _constraint.name = name;
  },
);
export const setConstraintFunctionDefinition = action(
  (_constraint: Constraint, lambda: RawLambda): void => {
    _constraint.functionDefinition = lambda;
  },
);

// Profile
export const addProfileTag = action((profile: Profile, value: Tag): void => {
  addUniqueEntry(profile.tags, value);
});
export const deleteProfileTag = action((profile: Profile, value: Tag): void => {
  deleteEntry(profile.tags, value);
});
export const addProfileStereotype = action(
  (profile: Profile, value: Stereotype): void => {
    addUniqueEntry(profile.stereotypes, value);
  },
);
export const deleteProfileStereotype = action(
  (profile: Profile, value: Stereotype): void => {
    deleteEntry(profile.stereotypes, value);
  },
);

// Function
export const deleteFunctionParameter = action(
  (_func: ConcreteFunctionDefinition, val: RawVariableExpression): void => {
    deleteEntry(_func.parameters, val);
  },
);
export const addFunctionParameter = action(
  (_func: ConcreteFunctionDefinition, val: RawVariableExpression): void => {
    addUniqueEntry(_func.parameters, val);
  },
);
export const setFunctionReturnType = action(
  (_func: ConcreteFunctionDefinition, val: Type): void => {
    setPackageableElementReferenceValue(_func.returnType, val);
  },
);
export const setFunctionReturnMultiplicity = action(
  (_func: ConcreteFunctionDefinition, val: Multiplicity): void => {
    _func.returnMultiplicity = val;
  },
);

// Enumeration
export const setEnumName = action((val: Enum, value: string): void => {
  val.name = value;
});
export const addEnumValue = action(
  (enumeration: Enumeration, value: Enum): void => {
    addUniqueEntry(enumeration.values, value);
  },
);
export const deleteEnumValue = action(
  (enumeration: Enumeration, value: Enum): void => {
    deleteEntry(enumeration.values, value);
  },
);
export const setEnumValueReferenceValue = action(
  (ref: EnumValueReference, value: Enum): void => {
    ref.value = value;
    setPackageableElementReferenceValue(ref.ownerReference, value.owner);
  },
);

// Measure
export const setMeasureCanonicalUnit = action(
  (_measure: Measure, unit: Unit): void => {
    _measure.canonicalUnit = unit;
  },
);
export const setUnitConversionFunction = action(
  (unit: Unit, lambda: RawLambda): void => {
    unit.conversionFunction = lambda;
  },
);

// Package

export const addPackageChild = action(
  (parent: Package, value: PackageableElement): void => {
    // NOTE: here we directly push the element to the children array without any checks rather than use `addUniqueEntry` to improve performance.
    // Duplication checks should be handled separately
    parent.children.push(value);
  },
);

export const addPackageElement = action(
  (parent: Package, element: PackageableElement): void => {
    addPackageChild(parent, element);
    element.setPackage(parent);
  },
);

export const deletePackageElement = action(
  (parent: Package, packageableElement: PackageableElement): void => {
    parent.children = parent.children.filter(
      (child) => child !== packageableElement,
    );
  },
);
