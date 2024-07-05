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

import {
  type PureProtocolProcessorPlugin,
  type V1_GraphFetchTree,
  V1_deserializeValueSpecification,
  V1_serializeValueSpecification,
} from '@finos/legend-graph';
import { V1_DataQualityRootGraphFetchTree } from '../model/graphFetch/V1_DataQualityRootGraphFetchTree.js';
import { V1_DataQualityPropertyGraphFetchTree } from '../model/graphFetch/V1_DataQualityPropertyGraphFetchTree.js';
import {
  type ModelSchema,
  custom,
  deserialize,
  serialize,
  createModelSchema,
  list,
  optional,
  primitive,
} from 'serializr';
import {
  type PlainObject,
  UnsupportedOperationError,
  usingConstantValueSchema,
} from '@finos/legend-shared';

const DATA_QUALTIY_ROOT_GRAPH_FETCH_TREE_TYPE = 'dataQualityRootGraphFetchTree';
const DATA_QUALITY_PROPERTY_GRAPH_FETCH_TREE_TYPE =
  'dataQualityPropertyGraphFetchTree';

const rootGraphFetchTreeModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_DataQualityRootGraphFetchTree> =>
  createModelSchema(V1_DataQualityRootGraphFetchTree, {
    _type: usingConstantValueSchema(DATA_QUALTIY_ROOT_GRAPH_FETCH_TREE_TYPE),
    class: primitive(),
    constraints: list(primitive()),
    subTrees: list(
      custom(
        (val) => V1_serializeGraphFetchTree(val, plugins),
        (val) => V1_deserializeGraphFetchTree(val, plugins),
      ),
    ),
  });

const propertyGraphFetchTreeModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_DataQualityPropertyGraphFetchTree> =>
  createModelSchema(V1_DataQualityPropertyGraphFetchTree, {
    _type: usingConstantValueSchema(
      DATA_QUALITY_PROPERTY_GRAPH_FETCH_TREE_TYPE,
    ),
    alias: optional(primitive()),
    parameters: list(
      custom(
        (val) => V1_serializeValueSpecification(val, plugins),
        (val) => V1_deserializeValueSpecification(val, plugins),
      ),
    ),
    property: primitive(),
    constraints: list(primitive()),
    subTrees: list(
      custom(
        (val) => V1_serializeGraphFetchTree(val, plugins),
        (val) => V1_deserializeGraphFetchTree(val, plugins),
      ),
    ),
  });

export function V1_serializeGraphFetchTree(
  protocol: V1_GraphFetchTree,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_GraphFetchTree> {
  if (protocol instanceof V1_DataQualityPropertyGraphFetchTree) {
    return serialize(propertyGraphFetchTreeModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_DataQualityRootGraphFetchTree) {
    return serialize(rootGraphFetchTreeModelSchema(plugins), protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize data quality graph fetch tree`,
    protocol,
  );
}

export function V1_deserializeGraphFetchTree(
  json: PlainObject<V1_GraphFetchTree>,
  plugins: PureProtocolProcessorPlugin[],
): V1_GraphFetchTree {
  switch (json._type) {
    case DATA_QUALITY_PROPERTY_GRAPH_FETCH_TREE_TYPE:
      return deserialize(propertyGraphFetchTreeModelSchema(plugins), json);
    case DATA_QUALTIY_ROOT_GRAPH_FETCH_TREE_TYPE:
      return deserialize(rootGraphFetchTreeModelSchema(plugins), json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize data quality graph fetch tree node of type '${json._type}'`,
      );
  }
}
