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
import {
  CORE_PURE_PATH,
  ELEMENT_PATH_DELIMITER,
  RESERVERD_PACKAGE_NAMES,
  MILESTONING_STEROTYPES,
} from '../MetaModelConst';
import { Profile } from '../models/metamodels/pure/packageableElements/domain/Profile';
import { Tag } from '../models/metamodels/pure/packageableElements/domain/Tag';
import { Enum } from '../models/metamodels/pure/packageableElements/domain/Enum';
import { Stereotype } from '../models/metamodels/pure/packageableElements/domain/Stereotype';
import { TaggedValue } from '../models/metamodels/pure/packageableElements/domain/TaggedValue';
import { TagExplicitReference } from '../models/metamodels/pure/packageableElements/domain/TagReference';
import type { Enumeration } from '../models/metamodels/pure/packageableElements/domain/Enumeration';
import { Package } from '../models/metamodels/pure/packageableElements/domain/Package';
import type { PackageableElement } from '../models/metamodels/pure/packageableElements/PackageableElement';
import {
  AssertionError,
  assertNonEmptyString,
  assertTrue,
  guaranteeType,
} from '@finos/legend-shared';
import { createPath } from '../MetaModelUtils';
import type { BasicModel } from '../graph/BasicModel';

export const addElementToPackage = (
  parent: Package,
  element: PackageableElement,
): void => {
  // To improve performance we won't do duplication check here
  parent.children.push(element);
  element.package = parent;
};

export const deleteElementFromPackage = (
  parent: Package,
  packageableElement: PackageableElement,
): void => {
  parent.children = parent.children.filter(
    (child) => child !== packageableElement,
  );
};

export const getElementRootPackage = (element: PackageableElement): Package =>
  !element.package
    ? guaranteeType(element, Package)
    : getElementRootPackage(element.package);

/**
 * If package name is a path, continue to recursively
 * traverse the package chain to find the leaf package
 *
 * NOTE: if we do not allow create new packages, errorcould be
 * thrown if a package with the specified path is not found
 */
export const getOrCreatePackage = (
  parentPackage: Package,
  relativePackagePath: string,
  createNewPackageIfNotFound: boolean,
  cache: Map<string, Package> | undefined,
): Package => {
  const index = relativePackagePath.indexOf(ELEMENT_PATH_DELIMITER);
  const packageName =
    index === -1
      ? relativePackagePath
      : relativePackagePath.substring(0, index);
  const packagePath = createPath(parentPackage.fullPath, packageName);

  // check cache to find the package
  // NOTE: we only return from cache if there is no child package to further traverse
  if (cache && index === -1) {
    const cachedPackage = cache.get(packagePath);
    if (cachedPackage) {
      return cachedPackage;
    }
  }

  // try to resolve when there is a cache miss
  let pkg: Package | undefined;
  pkg = parentPackage.children.find(
    (child: PackageableElement): child is Package =>
      child instanceof Package && child.name === packageName,
  );
  if (!pkg) {
    if (!createNewPackageIfNotFound) {
      throw new AssertionError(
        `Can't find child package '${packageName}' in package '${parentPackage.path}'`,
      );
    }
    // create the node if it is not in parent package
    assertTrue(
      !RESERVERD_PACKAGE_NAMES.includes(packageName),
      `Can't create package with reserved name '${packageName}'`,
    );
    pkg = new Package(packageName);
    pkg.package = parentPackage;
    // NOTE: here we directly push the element to the children array without any checks rather than use `addUniqueEntry` to improve performance.
    // Duplication checks should be handled separately for speed
    parentPackage.children.push(pkg);
  }

  // populate cache after resolving the package
  if (cache) {
    cache.set(packagePath, pkg);
  }

  // traverse the package chain
  if (index !== -1) {
    return getOrCreatePackage(
      pkg,
      relativePackagePath.substring(index + ELEMENT_PATH_DELIMITER.length),
      createNewPackageIfNotFound,
      cache,
    );
  }

  return pkg;
};

export const getOrCreateGraphPackage = (
  graph: BasicModel,
  packagePath: string | undefined,
  cache: Map<string, Package> | undefined,
): Package => {
  assertNonEmptyString(packagePath, 'Package path is required');
  return getOrCreatePackage(graph.root, packagePath, true, cache);
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
