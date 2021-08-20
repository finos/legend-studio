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

import { makeObservable, observable, action, computed } from 'mobx';
import { addUniqueEntry, deleteEntry } from '@finos/legend-shared';
import type { Class } from '../packageableElements/domain/Class';
import type { PropertyReference } from '../packageableElements/domain/PropertyReference';
import type {
  OptionalPackageableElementReference,
  PackageableElementReference,
} from '../packageableElements/PackageableElementReference';
import { OptionalPackageableElementExplicitReference } from '../packageableElements/PackageableElementReference';
import type {
  ValueSpecification,
  ValueSpecificationVisitor,
} from './ValueSpecification';
import { InstanceValue } from './InstanceValue';

export abstract class GraphFetchTree {
  subTrees: GraphFetchTree[] = [];

  constructor() {
    makeObservable(this, {
      subTrees: observable,
      addSubTree: action,
      removeSubTree: action,
      isEmpty: computed,
    });
  }

  get isEmpty(): boolean {
    return !this.subTrees.length;
  }
  addSubTree(val: GraphFetchTree): void {
    addUniqueEntry(this.subTrees, val);
  }
  removeSubTree(val: GraphFetchTree): void {
    deleteEntry(this.subTrees, val);
  }
}

export class RootGraphFetchTree extends GraphFetchTree {
  class: PackageableElementReference<Class>;

  constructor(_class: PackageableElementReference<Class>) {
    super();
    this.class = _class;
  }
}

export class PropertyGraphFetchTree extends GraphFetchTree {
  property: PropertyReference;
  alias?: string;
  parameters: ValueSpecification[] = []; //TODO
  subType: OptionalPackageableElementReference<Class>;

  constructor(
    property: PropertyReference,
    val?: OptionalPackageableElementReference<Class>,
  ) {
    super();

    makeObservable(this, {
      alias: observable,
      parameters: observable,
      subType: observable,
      withSubType: action,
    });
    this.property = property;
    this.subType =
      val ??
      OptionalPackageableElementExplicitReference.create<Class>(undefined);
  }

  withSubType(
    val: OptionalPackageableElementReference<Class>,
  ): PropertyGraphFetchTree {
    this.subType = val;
    return this;
  }
}

export abstract class GraphFetchTreeInstanceValue extends InstanceValue {
  override values: GraphFetchTree[] = [];
}

export class PropertyGraphFetchTreeInstanceValue extends GraphFetchTreeInstanceValue {
  override values: PropertyGraphFetchTree[] = [];

  override accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_PropertyGraphFetchTreeInstanceValue(this);
  }
}

export class RootGraphFetchTreeInstanceValue extends GraphFetchTreeInstanceValue {
  override values: RootGraphFetchTree[] = [];

  override accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_RootGraphFetchTreeInstanceValue(this);
  }
}
