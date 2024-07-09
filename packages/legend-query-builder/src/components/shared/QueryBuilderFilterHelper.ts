import type { QueryBuilderExplorerTreeDragSource } from '../../stores/explorer/QueryBuilderExplorerState.js';
import type { QueryBuilderProjectionColumnDragSource } from '../../stores/fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import type { QueryBuilderVariableDragSource } from './BasicValueSpecificationEditor.js';

export const isProjectionColumnDragSource = (
  itemToTest:
    | QueryBuilderVariableDragSource
    | QueryBuilderProjectionColumnDragSource
    | QueryBuilderExplorerTreeDragSource,
): itemToTest is QueryBuilderProjectionColumnDragSource =>
  Object.hasOwn(itemToTest, 'columnState');

export const isExplorerTreeDragSource = (
  itemToTest:
    | QueryBuilderVariableDragSource
    | QueryBuilderProjectionColumnDragSource
    | QueryBuilderExplorerTreeDragSource,
): itemToTest is QueryBuilderExplorerTreeDragSource =>
  Object.hasOwn(itemToTest, 'node');
