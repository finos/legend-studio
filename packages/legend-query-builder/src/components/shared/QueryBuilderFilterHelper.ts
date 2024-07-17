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

import type { Type } from '@finos/legend-graph';
import {
  QUERY_BUILDER_EXPLORER_TREE_DND_TYPE,
  type QueryBuilderExplorerTreeDragSource,
} from '../../stores/explorer/QueryBuilderExplorerState.js';
import {
  QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE,
  type QueryBuilderProjectionColumnDragSource,
} from '../../stores/fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import type { QueryBuilderFilterValueDropTarget } from '../../stores/filter/QueryBuilderFilterState.js';
import {
  QUERY_BUILDER_VARIABLE_DND_TYPE,
  type QueryBuilderVariableDragSource,
} from './BasicValueSpecificationEditor.js';

export const getDNDItemType = (
  item: QueryBuilderFilterValueDropTarget,
  type: string,
): Type | undefined => {
  switch (type) {
    case QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE:
      return (
        item as QueryBuilderProjectionColumnDragSource
      ).columnState.getColumnType();
    case QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ENUM_PROPERTY:
    case QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY:
      return (item as QueryBuilderExplorerTreeDragSource).node.property
        .genericType.value.rawType;
    case QUERY_BUILDER_VARIABLE_DND_TYPE:
      return (item as QueryBuilderVariableDragSource).variable.genericType
        ?.value.rawType;
    default:
      return undefined;
  }
};
