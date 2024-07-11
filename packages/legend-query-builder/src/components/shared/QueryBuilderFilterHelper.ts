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

export const getItemType = (
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
