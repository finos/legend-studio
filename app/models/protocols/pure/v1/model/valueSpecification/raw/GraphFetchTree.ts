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

import { list, deserialize, createModelSchema, primitive, custom, SKIP } from 'serializr';
import { UnsupportedOperationError } from 'Utilities/GeneralUtil';
import { ValueSpecification, ValueSpecificationType, ValueSpecificationVisitor } from 'V1/model/valueSpecification/ValueSpecification';

export abstract class GraphFetchTree extends ValueSpecification {
  _type!: ValueSpecificationType;
  subTrees: GraphFetchTree[] = [];

  abstract accept_ValueSpecificationVisitor<T>(visitor: ValueSpecificationVisitor<T>): T
}

export class PropertyGraphFetchTree extends GraphFetchTree {
  _type!: ValueSpecificationType; // remove when we use visitor for deserializer - this is a `serilizr` polymorphism bug - see https://github.com/mobxjs/serializr/issues/98
  alias?: string;
  parameters: ValueSpecification[] = [];
  property!: string;
  subTrees: GraphFetchTree[] = [];
  subType?: string;

  accept_ValueSpecificationVisitor<T>(visitor: ValueSpecificationVisitor<T>): T {
    return visitor.visit_PropertyGraphFetchTree(this);
  }
}

export class RootGraphFetchTree extends GraphFetchTree {
  _type!: ValueSpecificationType; // remove when we use visitor for deserializer - this is a `serilizr` polymorphism bug - see https://github.com/mobxjs/serializr/issues/98
  class!: string;
  subTrees: GraphFetchTree[] = [];

  accept_ValueSpecificationVisitor<T>(visitor: ValueSpecificationVisitor<T>): T {
    return visitor.visit_RootGraphFetchTree(this);
  }
}

createModelSchema(PropertyGraphFetchTree, {
  alias: primitive(),
  parameters: custom(() => SKIP, () => []), // TODO
  property: primitive(),
  subType: primitive(),
  subTrees: list(custom(() => SKIP, (value: GraphFetchTree) => {
    switch (value._type) {
      case ValueSpecificationType.PROPERTY_GRAPH_FETCH_TREE: return deserialize(PropertyGraphFetchTree, value);
      case ValueSpecificationType.ROOT_GRAPH_FETCH_TREE: return deserialize(RootGraphFetchTree, value);
      default: throw new UnsupportedOperationError(`Unsupported graph fetch tree type '${value._type}'`);
    }
  }))
});

createModelSchema(RootGraphFetchTree, {
  class: primitive(),
  subTrees: list(custom(() => SKIP, (value: GraphFetchTree) => {
    switch (value._type) {
      case ValueSpecificationType.PROPERTY_GRAPH_FETCH_TREE: return deserialize(PropertyGraphFetchTree, value);
      case ValueSpecificationType.ROOT_GRAPH_FETCH_TREE: return deserialize(RootGraphFetchTree, value);
      default: throw new UnsupportedOperationError(`Unsupported graph fetch tree type '${value._type}'`);
    }
  }))
});
