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

import type { PureModel } from '../graph/PureModel';
import { Class } from '../models/metamodels/pure/packageableElements/domain/Class';
import { CORE_PURE_PATH, MILESTONING_STEROTYPES } from '../MetaModelConst';
import { Profile } from '../models/metamodels/pure/packageableElements/domain/Profile';
import { Tag } from '../models/metamodels/pure/packageableElements/domain/Tag';
import { Enum } from '../models/metamodels/pure/packageableElements/domain/Enum';
import { Stereotype } from '../models/metamodels/pure/packageableElements/domain/Stereotype';
import { TaggedValue } from '../models/metamodels/pure/packageableElements/domain/TaggedValue';
import { TagExplicitReference } from '../models/metamodels/pure/packageableElements/domain/TagReference';
import type { Enumeration } from '../models/metamodels/pure/packageableElements/domain/Enumeration';
import type { Package } from '../models/metamodels/pure/packageableElements/domain/Package';
import type { PackageableElement } from '../models/metamodels/pure/packageableElements/PackageableElement';

export const _package_addElement = (
  parent: Package,
  element: PackageableElement,
): void => {
  // NOTE: here we directly push the element to the children array without any checks rather than use `addUniqueEntry` to improve performance.
  // Duplication checks should be handled separately
  parent.children.push(element);
  element.package = parent;
};

export const _package_deleteElement = (
  parent: Package,
  packageableElement: PackageableElement,
): void => {
  parent.children = parent.children.filter(
    (child) => child !== packageableElement,
  );
};

export const createStubTag = (profile: Profile): Tag => new Tag(profile, '');
export const createStubTaggedValue = (tag: Tag): TaggedValue =>
  new TaggedValue(TagExplicitReference.create(tag), '');
export const createStubStereotype = (profile: Profile): Stereotype =>
  new Stereotype(profile, '');
export const createStubProfile = (): Profile => new Profile('');
export const createStubEnum = (enumeration: Enumeration): Enum =>
  new Enum('', enumeration);

export const getMilestoneTemporalStereotype = (
  val: Class,
  graph: PureModel,
): MILESTONING_STEROTYPES | undefined => {
  const milestonedProfile = graph.getProfile(CORE_PURE_PATH.PROFILE_TEMPORAL);
  let stereotype;
  const profile = val.stereotypes.find(
    (st) => st.ownerReference.value === milestonedProfile,
  );
  stereotype = Object.values(MILESTONING_STEROTYPES).find(
    (value) => value === profile?.value.value,
  );
  if (stereotype !== undefined) {
    return stereotype;
  }
  val.generalizations.forEach((generalization) => {
    const superType = generalization.value.rawType;
    if (superType instanceof Class) {
      const milestonedStereotype = getMilestoneTemporalStereotype(
        superType,
        graph,
      );
      if (milestonedStereotype !== undefined) {
        stereotype = Object.values(MILESTONING_STEROTYPES).find(
          (value) => value === milestonedStereotype,
        );
      }
    }
  });
  return stereotype;
};
