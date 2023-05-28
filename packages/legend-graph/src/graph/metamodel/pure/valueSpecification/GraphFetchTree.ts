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

import type { Class } from '../packageableElements/domain/Class.js';
import type { PropertyReference } from '../packageableElements/domain/PropertyReference.js';
import type { PackageableElementReference } from '../packageableElements/PackageableElementReference.js';
import type {
  ValueSpecification,
  ValueSpecificationVisitor,
} from './ValueSpecification.js';
import { InstanceValue } from './InstanceValue.js';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../Core_HashUtils.js';
import { Multiplicity } from '../packageableElements/domain/Multiplicity.js';

export abstract class GraphFetchTree implements Hashable {
  subTrees: GraphFetchTree[] = [];
  subTypeTrees: SubTypeGraphFetchTree[] = [];
  abstract get hashCode(): string;

  get isEmpty(): boolean {
    return !this.subTrees.length;
  }
}

export class RootGraphFetchTree extends GraphFetchTree implements Hashable {
  class: PackageableElementReference<Class>;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.ROOT_GRAPH_FETCH_TREE,
      hashArray(this.subTrees),
      hashArray(this.subTypeTrees),
      this.class.valueForSerialization ?? '',
    ]);
  }

  constructor(_class: PackageableElementReference<Class>) {
    super();
    this.class = _class;
  }
}

export class PropertyGraphFetchTree extends GraphFetchTree implements Hashable {
  property: PropertyReference;
  alias?: string | undefined;
  parameters: ValueSpecification[] = []; //TODO
  subType?: PackageableElementReference<Class> | undefined;

  constructor(
    property: PropertyReference,
    subType: PackageableElementReference<Class> | undefined,
  ) {
    super();
    this.property = property;
    this.subType = subType;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.PROPERTY_GRAPH_FETCH_TREE,
      hashArray(this.subTrees),
      this.property.ownerReference.valueForSerialization ?? '',
      this.alias ?? '',
      hashArray(this.parameters),
      this.subType?.valueForSerialization ?? '',
    ]);
  }
}

export class SubTypeGraphFetchTree extends GraphFetchTree implements Hashable {
  subTypeClass: PackageableElementReference<Class>;

  constructor(subTypeClass: PackageableElementReference<Class>) {
    super();
    this.subTypeClass = subTypeClass;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SUBTYPE_GRAPH_FETCH_TREE,
      hashArray(this.subTrees),
      this.subTypeClass.valueForSerialization ?? '',
    ]);
  }
}

export class GraphFetchTreeInstanceValue
  extends InstanceValue
  implements Hashable
{
  override values: RootGraphFetchTree[] = [];

  constructor() {
    super(Multiplicity.ONE);
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.ROOT_GRAPH_FETCH_TREE_INSTANCE_VALUE,
      this.genericType?.ownerReference.valueForSerialization ?? '',
      this.multiplicity,
      hashArray(this.values),
    ]);
  }

  override accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_GraphFetchTreeInstanceValue(this);
  }
}
