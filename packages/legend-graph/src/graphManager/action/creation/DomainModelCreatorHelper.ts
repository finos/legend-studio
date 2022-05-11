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

import { Profile } from '../../../models/metamodels/pure/packageableElements/domain/Profile';
import { Tag } from '../../../models/metamodels/pure/packageableElements/domain/Tag';
import { Enum } from '../../../models/metamodels/pure/packageableElements/domain/Enum';
import { Stereotype } from '../../../models/metamodels/pure/packageableElements/domain/Stereotype';
import { TaggedValue } from '../../../models/metamodels/pure/packageableElements/domain/TaggedValue';
import { TagExplicitReference } from '../../../models/metamodels/pure/packageableElements/domain/TagReference';
import type { Enumeration } from '../../../models/metamodels/pure/packageableElements/domain/Enumeration';
import { Class } from '../../../models/metamodels/pure/packageableElements/domain/Class';
import { Constraint } from '../../../models/metamodels/pure/packageableElements/domain/Constraint';
import { stub_RawLambda } from './RawValueSpecificationCreatorHelper';
import type { PackageableElement } from '../../../models/metamodels/pure/packageableElements/PackageableElement';
import { Multiplicity } from '../../../models/metamodels/pure/packageableElements/domain/Multiplicity';
import { GenericTypeExplicitReference } from '../../../models/metamodels/pure/packageableElements/domain/GenericTypeReference';
import { GenericType } from '../../../models/metamodels/pure/packageableElements/domain/GenericType';
import type { Type } from '../../../models/metamodels/pure/packageableElements/domain/Type';
import { DerivedProperty } from '../../../models/metamodels/pure/packageableElements/domain/DerivedProperty';
import { Property } from '../../../models/metamodels/pure/packageableElements/domain/Property';

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
    // NOTE: this multiplicity is subjected to change so we cannot pass
    // the one from the graph typical multiplicity index
    new Multiplicity(1, 1),
    GenericTypeExplicitReference.create(new GenericType(type)),
    _class,
  );
export const stub_DerivedProperty = (
  type: Type,
  _class: Class,
): DerivedProperty =>
  new DerivedProperty(
    '',
    // NOTE: this multiplicity is subjected to change so we cannot pass
    // the one from the graph typical multiplicity index
    new Multiplicity(1, 1),
    GenericTypeExplicitReference.create(new GenericType(type)),
    _class,
  );

export const isStubbed_PackageableElement = (
  element: PackageableElement,
): boolean => !element.package && !element.name;
