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

import { observable, action, computed, makeObservable } from 'mobx';
import {
  CORE_HASH_STRUCTURE,
  ELEMENT_PATH_DELIMITER,
} from '../../../../../MetaModelConst';
import {
  hashArray,
  assertTrue,
  addUniqueEntry,
} from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { GraphError } from '../../../../../MetaModelUtility';
import type { PackageableElementVisitor } from '../../../model/packageableElements/PackageableElement';
import { PackageableElement } from '../../../model/packageableElements/PackageableElement';

export const RESERVERD_PACKAGE_NAMES = ['$implicit'];

export class Package extends PackageableElement implements Hashable {
  children: PackageableElement[] = [];

  constructor(name: string) {
    super(name);

    makeObservable(this, {
      children: observable,
      setPackage: action,
      addChild: action,
      addElement: action,
      hashCode: computed,
    });
  }

  static createPackageFromParent(name: string, parent: Package): Package {
    assertTrue(
      !RESERVERD_PACKAGE_NAMES.includes(name),
      `Can't create package with reserved name '${name}'`,
    );
    const newPackage = new Package(name);
    newPackage.setPackage(parent);
    return newPackage;
  }

  setPackage(value: Package): void {
    this.package = value;
  }
  addChild(value: PackageableElement): void {
    addUniqueEntry(this.children, value);
  }

  addElement(element: PackageableElement): void {
    this.addChild(element);
    element.package = this;
  }

  get fullPath(): string {
    if (!this.package) {
      return '';
    }
    const parentPackageName = this.package.fullPath;
    return !parentPackageName
      ? this.name
      : `${parentPackageName}${ELEMENT_PATH_DELIMITER}${this.name}`;
  }

  deleteElement(packageableElement: PackageableElement): void {
    this.children = this.children.filter((c) => c !== packageableElement);
  }

  /**
   * If package name is a path, continue to recursively traverse the package chain to find the leaf package
   * NOTE: if we do not allow insertion, error could be thrown if a package in the path is not found
   */
  static getOrCreatePackage(
    parent: Package,
    packageName: string,
    insert: boolean,
  ): Package {
    const index = packageName.indexOf(ELEMENT_PATH_DELIMITER);
    const str = index === -1 ? packageName : packageName.substring(0, index);
    let node: Package | undefined;
    node = parent.children.find(
      (child: PackageableElement): child is Package =>
        child instanceof Package && child.name === str,
    );
    if (!node) {
      if (insert) {
        // create the node if it is not in parent package
        node = Package.createPackageFromParent(str, parent);
        parent.addChild(node);
      } else {
        throw new GraphError(
          `Can't find packageable element '${str}' in package '${packageName}'`,
        );
      }
    }
    if (index !== -1) {
      return Package.getOrCreatePackage(
        node,
        packageName.substring(index + 2),
        insert,
      );
    }
    return node;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.PACKAGE,
      super.hashCode,
      hashArray(this.children.map((child) => child.path)),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_Package(this);
  }
}
