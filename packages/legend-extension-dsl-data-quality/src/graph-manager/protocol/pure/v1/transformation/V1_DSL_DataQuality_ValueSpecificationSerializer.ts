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
  V1_deserializeValueSpecification,
  V1_serializeValueSpecification,
  V1_serializeGraphFetchTree,
  V1_deserializeGraphFetchTree,
} from '@finos/legend-graph';
import { V1_DataQualityRootGraphFetchTree } from '../model/graphFetch/V1_DataQualityRootGraphFetchTree.js';
import { V1_DataQualityPropertyGraphFetchTree } from '../model/graphFetch/V1_DataQualityPropertyGraphFetchTree.js';
import {
  type ModelSchema,
  custom,
  createModelSchema,
  list,
  optional,
  primitive,
} from 'serializr';
import { usingConstantValueSchema } from '@finos/legend-shared';

export const V1_DATA_QUALTIY_ROOT_GRAPH_FETCH_TREE_TYPE =
  'dataQualityRootGraphFetchTree';
export const V1_DATA_QUALITY_PROPERTY_GRAPH_FETCH_TREE_TYPE =
  'dataQualityPropertyGraphFetchTree';

export const V1_rootGraphFetchTreeModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_DataQualityRootGraphFetchTree> =>
  createModelSchema(V1_DataQualityRootGraphFetchTree, {
    _type: usingConstantValueSchema(V1_DATA_QUALTIY_ROOT_GRAPH_FETCH_TREE_TYPE),
    class: primitive(),
    constraints: list(primitive()),
    subTrees: list(
      custom(
        (val) => V1_serializeGraphFetchTree(val, plugins),
        (val) => V1_deserializeGraphFetchTree(val, plugins),
      ),
    ),
    subTypeTrees: list(
      custom(
        (val) => V1_serializeGraphFetchTree(val, plugins),
        (val) => V1_deserializeGraphFetchTree(val, plugins),
      ),
    ),
  });

export const V1_propertyGraphFetchTreeModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_DataQualityPropertyGraphFetchTree> =>
  createModelSchema(V1_DataQualityPropertyGraphFetchTree, {
    _type: usingConstantValueSchema(
      V1_DATA_QUALITY_PROPERTY_GRAPH_FETCH_TREE_TYPE,
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
    subTypeTrees: list(
      custom(
        (val) => V1_serializeGraphFetchTree(val, plugins),
        (val) => V1_deserializeGraphFetchTree(val, plugins),
      ),
    ),
    subType: optional(primitive()),
  });
