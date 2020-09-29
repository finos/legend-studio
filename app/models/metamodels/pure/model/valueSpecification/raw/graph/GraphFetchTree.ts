/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { observable, action, computed } from 'mobx';
import { addUniqueEntry, deleteEntry } from 'Utilities/GeneralUtil';
import { ValueSpecification, ValueSpecificationVisitor } from 'MM/model/valueSpecification/ValueSpecification';
import { PropertyReference } from 'MM/model/packageableElements/domain/PropertyReference';
import { OptionalPackageableElementReference, PackageableElementReference } from 'MM/model/packageableElements/PackageableElementReference';
import { Class } from 'MM/model/packageableElements/domain/Class';

export abstract class GraphFetchTree extends ValueSpecification {
  @observable subTrees: GraphFetchTree[] = [];

  @action addSubTree(val: GraphFetchTree): void { addUniqueEntry(this.subTrees, val) }
  @action removeSubTree(val: GraphFetchTree): void { deleteEntry(this.subTrees, val) }

  @computed get isEmpty(): boolean { return !this.subTrees.length }

  abstract accept_ValueSpecificationVisitor<T>(visitor: ValueSpecificationVisitor<T>): T
}

export class PropertyGraphFetchTree extends GraphFetchTree {
  property: PropertyReference;
  @observable alias?: string;
  @observable parameters: ValueSpecification[] = []; // TODO
  @observable subType!: OptionalPackageableElementReference<Class>;

  constructor(property: PropertyReference) {
    super();
    this.property = property;
  }

  @action withSubType(val: OptionalPackageableElementReference<Class>): PropertyGraphFetchTree { this.subType = val; return this }

  accept_ValueSpecificationVisitor<T>(visitor: ValueSpecificationVisitor<T>): T {
    return visitor.visit_PropertyGraphFetchTree(this);
  }
}

export class RootGraphFetchTree extends GraphFetchTree {
  class: PackageableElementReference<Class>;

  constructor(_class: PackageableElementReference<Class>) {
    super();
    this.class = _class;
  }

  accept_ValueSpecificationVisitor<T>(visitor: ValueSpecificationVisitor<T>): T {
    return visitor.visit_RootGraphFetchTree(this);
  }
}
