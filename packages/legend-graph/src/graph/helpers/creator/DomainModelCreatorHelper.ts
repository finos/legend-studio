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

import { Profile } from '../../metamodel/pure/packageableElements/domain/Profile.js';
import { Tag } from '../../metamodel/pure/packageableElements/domain/Tag.js';
import { Enum } from '../../metamodel/pure/packageableElements/domain/Enum.js';
import { Stereotype } from '../../metamodel/pure/packageableElements/domain/Stereotype.js';
import { TaggedValue } from '../../metamodel/pure/packageableElements/domain/TaggedValue.js';
import { TagExplicitReference } from '../../metamodel/pure/packageableElements/domain/TagReference.js';
import type { Enumeration } from '../../metamodel/pure/packageableElements/domain/Enumeration.js';
import { Class } from '../../metamodel/pure/packageableElements/domain/Class.js';
import { Constraint } from '../../metamodel/pure/packageableElements/domain/Constraint.js';
import { stub_RawLambda } from './RawValueSpecificationCreatorHelper.js';
import type { PackageableElement } from '../../metamodel/pure/packageableElements/PackageableElement.js';
import { Multiplicity } from '../../metamodel/pure/packageableElements/domain/Multiplicity.js';
import { GenericTypeExplicitReference } from '../../metamodel/pure/packageableElements/domain/GenericTypeReference.js';
import { GenericType } from '../../metamodel/pure/packageableElements/domain/GenericType.js';
import type { Type } from '../../metamodel/pure/packageableElements/domain/Type.js';
import { DerivedProperty } from '../../metamodel/pure/packageableElements/domain/DerivedProperty.js';
import { Property } from '../../metamodel/pure/packageableElements/domain/Property.js';
import { Package } from '../../metamodel/pure/packageableElements/domain/Package.js';
import { getOrCreatePackage } from '../DomainHelper.js';

export const stub_ElementhWithPackagePath = <T extends PackageableElement>(
  element: T,
  packagePath: string,
): T => {
  const root = new Package('');
  element.package = getOrCreatePackage(root, packagePath, true, undefined);
  return element;
};
export const stub_Tag = (profile: Profile): Tag => new Tag(profile, '');
export const stub_TaggedValue = (tag: Tag): TaggedValue =>
  new TaggedValue(TagExplicitReference.create(tag), '');
export const stub_Stereotype = (profile: Profile): Stereotype =>
  new Stereotype(profile, '');
export const stub_Profile = (): Profile => new Profile('');
export const stub_Enum = (enumeration: Enumeration): Enum =>
  new Enum('', enumeration);
export const stub_Constraint = (_class: Class): Constraint =>
  new Constraint('', _class, stub_RawLambda());
export const stub_Class = (): Class => new Class('');
export const stub_Property = (type: Type, _class: Class): Property =>
  new Property(
    '',
    Multiplicity.ONE,
    GenericTypeExplicitReference.create(new GenericType(type)),
    _class,
  );
export const stub_DerivedProperty = (
  type: Type,
  _class: Class,
): DerivedProperty =>
  new DerivedProperty(
    '',
    Multiplicity.ONE,
    GenericTypeExplicitReference.create(new GenericType(type)),
    _class,
  );

export const isStubbed_PackageableElement = (
  element: PackageableElement,
): boolean => !element.package && !element.name;
