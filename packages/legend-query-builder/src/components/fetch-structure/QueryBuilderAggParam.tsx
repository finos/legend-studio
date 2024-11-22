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

import { QueryBuilderSimpleProjectionColumnState } from '../../stores/fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import { useDragLayer, useDrop } from 'react-dnd';
import {
  ExclamationCircleIcon,
  PanelEntryDropZonePlaceholder,
} from '@finos/legend-art';
import {
  QUERY_BUILDER_EXPLORER_TREE_DND_TYPE,
  buildPropertyExpressionFromExplorerTreeNodeData,
  type QueryBuilderExplorerTreeDragSource,
} from '../../stores/explorer/QueryBuilderExplorerState.js';
import { type QueryBuilderTDSPanelDropTarget } from './QueryBuilderTDSPanel.js';
import { QueryBuilderAggregateOperator_Wavg } from '../../stores/fetch-structure/tds/aggregation/operators/QueryBuilderAggregateOperator_Wavg.js';
import type { QueryBuilderTDSState } from '../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';

export const WavgParamDNDZone = (props: {
  column: QueryBuilderAggregateOperator_Wavg;
  tdsState: QueryBuilderTDSState;
}): React.ReactNode => {
  const { column, tdsState } = props;

  const handleDrop = (item: QueryBuilderTDSPanelDropTarget): void => {
    const projectionColumnState = new QueryBuilderSimpleProjectionColumnState(
      tdsState,
      buildPropertyExpressionFromExplorerTreeNodeData(
        (item as QueryBuilderExplorerTreeDragSource).node,
        tdsState.queryBuilderState.explorerState,
      ),
      tdsState.queryBuilderState.explorerState.humanizePropertyName,
    );
    if (
      column instanceof QueryBuilderAggregateOperator_Wavg &&
      column.isCompatibleWithColumn(projectionColumnState)
    ) {
      column.setWeight(
        projectionColumnState.propertyExpressionState.propertyExpression,
      );
    }
  };

  const [{ isDragOver }, dropWavgParam] = useDrop<
    QueryBuilderTDSPanelDropTarget,
    void,
    { isDragOver: boolean }
  >(
    () => ({
      accept: QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY,
      drop: (item, monitor): void => {
        handleDrop(item);
      },
      collect: (monitor) => ({
        isDragOver: monitor.isOver({ shallow: true }),
      }),
    }),
    [handleDrop],
  );

  const { isDroppable } = useDragLayer((monitor) => ({
    isDroppable:
      monitor.isDragging() &&
      QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY.includes(
        monitor.getItemType()?.toString() ?? '',
      ),
  }));

  const weightIsSet = () => column.weight !== undefined;

  const getWeightName = (): string => {
    if (column instanceof QueryBuilderAggregateOperator_Wavg) {
      return column.weight?.func.value.name ?? '';
    } else {
      return '';
    }
  };

  return (
    <div
      data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_WAVG_DROPZONE}
      ref={dropWavgParam}
    >
      <div>
        <PanelEntryDropZonePlaceholder
          isDragOver={isDragOver}
          isDroppable={isDroppable}
          label="Drop Numeric Property"
        >
          <div
            className={
              weightIsSet()
                ? 'query-builder__projection__column__aggregate__operator__percentile__badge'
                : 'query-builder__projection__column__aggregate__operator__percentile__badge__unset'
            }
          >
            {!weightIsSet() && (
              <>
                <ExclamationCircleIcon /> Drop weight value{' '}
              </>
            )}
            {weightIsSet() && getWeightName()}
          </div>
        </PanelEntryDropZonePlaceholder>
      </div>
    </div>
  );
};
