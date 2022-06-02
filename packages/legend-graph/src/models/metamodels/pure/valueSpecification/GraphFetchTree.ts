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
import {
  OptionalPackageableElementExplicitReference,
  type OptionalPackageableElementReference,
  type PackageableElementReference,
} from '../packageableElements/PackageableElementReference.js';
import type {
  ValueSpecification,
  ValueSpecificationVisitor,
} from './ValueSpecification.js';
import { InstanceValue } from './InstanceValue.js';

export abstract class GraphFetchTree {
  subTrees: GraphFetchTree[] = [];

  get isEmpty(): boolean {
    return !this.subTrees.length;
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
  alias?: string | undefined;
  parameters: ValueSpecification[] = []; //TODO
  subType: OptionalPackageableElementReference<Class>;

  constructor(
    property: PropertyReference,
    val?: OptionalPackageableElementReference<Class>,
  ) {
    super();
    this.property = property;
    this.subType =
      val ??
      OptionalPackageableElementExplicitReference.create<Class>(undefined);
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
