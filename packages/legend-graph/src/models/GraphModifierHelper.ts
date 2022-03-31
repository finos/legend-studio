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

import type { GenericType } from './metamodels/pure/packageableElements/domain/GenericType';
import type { GenericTypeReference } from './metamodels/pure/packageableElements/domain/GenericTypeReference';
import type { Multiplicity } from './metamodels/pure/packageableElements/domain/Multiplicity';
import type { Package } from './metamodels/pure/packageableElements/domain/Package';
import type { Tag } from './metamodels/pure/packageableElements/domain/Tag';
import type { TagReference } from './metamodels/pure/packageableElements/domain/TagReference';
import type { PackageableElement } from './metamodels/pure/packageableElements/PackageableElement';

export const _tagReference_setValue = (tV: TagReference, value: Tag): void => {
  tV.value = value;
  tV.ownerReference.setValue(value.owner);
};
// Package
export const _package_addChild = (
  parent: Package,
  value: PackageableElement,
): void => {
  // NOTE: here we directly push the element to the children array without any checks rather than use `addUniqueEntry` to improve performance.
  // Duplication checks should be handled separately
  parent.children.push(value);
};

export const _package_addElement = (
  parent: Package,
  element: PackageableElement,
): void => {
  _package_addChild(parent, element);
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
//
export const _multiplicity_setLowerBound = (
  _m: Multiplicity,
  val: number,
): void => {
  _m.lowerBound = val;
};
export const _multiplicity_setUpperBound = (
  _m: Multiplicity,
  val: number | undefined,
): void => {
  _m.upperBound = val;
};
