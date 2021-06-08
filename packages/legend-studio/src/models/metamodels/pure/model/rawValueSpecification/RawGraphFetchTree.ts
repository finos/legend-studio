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
import { addUniqueEntry, deleteEntry } from '@finos/legend-studio-shared';
import type { RawValueSpecificationVisitor } from '../../model/rawValueSpecification/RawValueSpecification';
import { RawValueSpecification } from '../../model/rawValueSpecification/RawValueSpecification';
import type { PropertyReference } from '../../model/packageableElements/domain/PropertyReference';
import type {
  OptionalPackageableElementReference,
  PackageableElementReference,
} from '../../model/packageableElements/PackageableElementReference';
import type { Class } from '../../model/packageableElements/domain/Class';

export abstract class RawGraphFetchTree extends RawValueSpecification {
  subTrees: RawGraphFetchTree[] = [];

  constructor() {
    super();

    makeObservable(this, {
      subTrees: observable,
      addSubTree: action,
      removeSubTree: action,
      isEmpty: computed,
    });
  }

  addSubTree(val: RawGraphFetchTree): void {
    addUniqueEntry(this.subTrees, val);
  }
  removeSubTree(val: RawGraphFetchTree): void {
    deleteEntry(this.subTrees, val);
  }

  get isEmpty(): boolean {
    return !this.subTrees.length;
  }
}

export class RawPropertyGraphFetchTree extends RawGraphFetchTree {
  property: PropertyReference;
  alias?: string;
  parameters: RawValueSpecification[] = []; // TODO
  subType!: OptionalPackageableElementReference<Class>;

  constructor(property: PropertyReference) {
    super();

    makeObservable(this, {
      alias: observable,
      parameters: observable,
      subType: observable,
      withSubType: action,
    });

    this.property = property;
  }

  withSubType(
    val: OptionalPackageableElementReference<Class>,
  ): RawPropertyGraphFetchTree {
    this.subType = val;
    return this;
  }

  accept_ValueSpecificationVisitor<T>(
    visitor: RawValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_RawPropertyGraphFetchTree(this);
  }
}

export class RawRootGraphFetchTree extends RawGraphFetchTree {
  class: PackageableElementReference<Class>;

  constructor(_class: PackageableElementReference<Class>) {
    super();
    this.class = _class;
  }

  accept_ValueSpecificationVisitor<T>(
    visitor: RawValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_RawRootGraphFetchTree(this);
  }
}
