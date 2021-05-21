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

import { useEffect, useRef, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { clsx, BlankPanelPlaceholder } from '@finos/legend-studio-components';
import { MdFunctions } from 'react-icons/md';
import { FaInfoCircle, FaTimes } from 'react-icons/fa';
import type {
  QueryBuilderExplorerTreeDragSource,
  QueryBuilderExplorerTreePropertyNodeData,
} from '../stores/QueryBuilderExplorerState';
import { QUERY_BUILDER_EXPLORER_TREE_DND_TYPE } from '../stores/QueryBuilderExplorerState';
import type { DropTargetMonitor, XYCoord } from 'react-dnd';
import { useDragLayer, useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import type {
  QueryBuilderProjectionColumnState,
  QueryBuilderProjectionColumnDragSource,
  QueryBuilderProjectionDropTarget,
  QueryBuilderProjectionColumnRearrangeDropTarget,
} from '../stores/QueryBuilderFetchStructureState';
import { QUERY_BUILDER_PROJECTION_DND_TYPE } from '../stores/QueryBuilderFetchStructureState';
import { QueryBuilderPropertyInfoTooltip } from './QueryBuilderPropertyInfoTooltip';
import { getPropertyPath } from '../stores/QueryBuilderPropertyEditorState';
import { QueryBuilderPropertyExpressionBadge } from './QueryBuilderPropertyExpressionEditor';
import type { QueryBuilderState } from '../stores/QueryBuilderState';
import { QueryResultModifierModal } from './QueryBuilderResultModifierPanel';
import { useApplicationStore } from '@finos/legend-studio';
import { QUERY_BUILDER_TEST_ID } from '../QueryBuilder_Constants';

const ProjectionColumnDragLayer: React.FC = () => {
  const { itemType, item, isDragging, currentPosition } = useDragLayer(
    (monitor) => ({
      itemType: monitor.getItemType(),
      item: monitor.getItem() as QueryBuilderProjectionColumnDragSource | null,
      isDragging: monitor.isDragging(),
      initialOffset: monitor.getInitialSourceClientOffset(),
      currentPosition: monitor.getClientOffset(),
    }),
  );

  if (
    !isDragging ||
    !item ||
    itemType !== QUERY_BUILDER_PROJECTION_DND_TYPE.PROJECTION_COLUMN
  ) {
    return null;
  }
  return (
    <div className="query-builder__projection__column__drag-preview-layer">
      <div
        className="query-builder__projection__column__drag-preview"
        // added some offset so the mouse doesn't overlap the label too much
        style={
          !currentPosition
            ? { display: 'none' }
            : {
                transform: `translate(${currentPosition.x + 20}px, ${
                  currentPosition.y + 10
                }px)`,
              }
        }
      >
        {item.columnState.columnName}
      </div>
    </div>
  );
};

const QueryBuilderProjectionColumn = observer(
  (props: {
    projectionColumnState: QueryBuilderProjectionColumnState;
    isRearrangingColumns: boolean;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const { projectionColumnState, isRearrangingColumns } = props;
    const queryBuilderState =
      projectionColumnState.projectionState.queryBuilderState;
    const projectionState = queryBuilderState.fetchStructureState;
    const applicationStore = useApplicationStore();
    const setAggregation = (): void =>
      applicationStore.notifyUnsupportedFeature('Column aggregation');
    const changeColumnName: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => projectionColumnState.setColumnName(event.target.value);
    const removeColumn = (): void =>
      projectionState.removeProjectionColumn(projectionColumnState);
    const onPropertyExpressionChange = (
      node: QueryBuilderExplorerTreePropertyNodeData,
    ): void => projectionColumnState.changeProperty(node);

    // Drag and Drop
    const handleHover = useCallback(
      (
        item: QueryBuilderProjectionColumnRearrangeDropTarget,
        monitor: DropTargetMonitor,
      ): void => {
        const dragIndex = projectionState.projectionColumns.findIndex(
          (e) => e === item.columnState,
        );
        const hoverIndex = projectionState.projectionColumns.findIndex(
          (e) => e === projectionColumnState,
        );
        if (dragIndex === -1 || hoverIndex === -1 || dragIndex === hoverIndex) {
          return;
        }
        // move the item being hovered on when the dragged item position is beyond the its middle point
        const hoverBoundingReact = ref.current?.getBoundingClientRect();
        const distanceThreshold =
          ((hoverBoundingReact?.bottom ?? 0) - (hoverBoundingReact?.top ?? 0)) /
          2;
        const dragDistance =
          (monitor.getClientOffset() as XYCoord).y -
          (hoverBoundingReact?.top ?? 0);
        if (dragIndex < hoverIndex && dragDistance < distanceThreshold) {
          return;
        }
        if (dragIndex > hoverIndex && dragDistance > distanceThreshold) {
          return;
        }
        projectionState.moveProjectionColumn(dragIndex, hoverIndex);
      },
      [projectionColumnState, projectionState],
    );
    const [, dropConnector] = useDrop(
      () => ({
        accept: [QUERY_BUILDER_PROJECTION_DND_TYPE.PROJECTION_COLUMN],
        hover: (
          item: QueryBuilderProjectionColumnRearrangeDropTarget,
          monitor: DropTargetMonitor,
        ): void => handleHover(item, monitor),
      }),
      [handleHover],
    );
    const [, dragConnector, dragPreviewConnector] = useDrag(
      () => ({
        type: QUERY_BUILDER_PROJECTION_DND_TYPE.PROJECTION_COLUMN,
        item: (): QueryBuilderProjectionColumnDragSource => {
          projectionColumnState.setIsBeingDragged(true);
          return { columnState: projectionColumnState };
        },
        end: (item: QueryBuilderProjectionColumnDragSource | undefined): void =>
          item?.columnState.setIsBeingDragged(false),
      }),
      [projectionColumnState],
    );
    dragConnector(dropConnector(ref));

    // hide default HTML5 preview image
    useEffect(() => {
      dragPreviewConnector(getEmptyImage(), { captureDraggingState: true });
    }, [dragPreviewConnector]);

    return (
      <div
        ref={ref}
        className={clsx('query-builder__projection__column', {
          'query-builder__projection__column--dragged':
            projectionColumnState.isBeingDragged,
          'query-builder__projection__column--no-hover': isRearrangingColumns,
        })}
      >
        {projectionColumnState.isBeingDragged && (
          <div className="query-builder__dnd__placeholder" />
        )}
        {!projectionColumnState.isBeingDragged && (
          <>
            <div className="query-builder__projection__column__value">
              <input
                className="query-builder__projection__column__value__input"
                spellCheck={false}
                value={projectionColumnState.columnName}
                onChange={changeColumnName}
              />
              <div className="query-builder__projection__column__value__property">
                <QueryBuilderPropertyExpressionBadge
                  propertyEditorState={
                    projectionColumnState.propertyEditorState
                  }
                  onPropertyExpressionChange={onPropertyExpressionChange}
                />
              </div>
            </div>
            <div className="query-builder__projection__column__actions">
              <QueryBuilderPropertyInfoTooltip
                property={
                  projectionColumnState.propertyEditorState.propertyExpression
                    .func
                }
                path={getPropertyPath(
                  projectionColumnState.propertyEditorState.propertyExpression,
                )}
                isMapped={true}
                placement="bottom-end"
              >
                <div className="query-builder__projection__column__action">
                  <FaInfoCircle />
                </div>
              </QueryBuilderPropertyInfoTooltip>
              <button
                className="query-builder__projection__column__action"
                tabIndex={-1}
                onClick={setAggregation}
                title={`Aggregate...`}
              >
                <MdFunctions className="query-builder__icon query-builder__icon__aggregate" />
              </button>
              <button
                className="query-builder__projection__column__action"
                tabIndex={-1}
                onClick={removeColumn}
                title={`Remove`}
              >
                <FaTimes />
              </button>
            </div>
          </>
        )}
      </div>
    );
  },
);

export const QueryBuilderProjectionPanel = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const projectionState = queryBuilderState.fetchStructureState;
    const projectionColumns = projectionState.projectionColumns;
    // Drag and Drop
    const isRearrangingColumns = projectionColumns.some(
      (columnState) => columnState.isBeingDragged,
    );
    const handleDrop = useCallback(
      (item: QueryBuilderProjectionDropTarget): void =>
        projectionState.addProjectionColumn(item.node),
      [projectionState],
    );
    const [{ isPropertyDragOver }, dropConnector] = useDrop(
      () => ({
        accept: [
          QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ENUM_PROPERTY,
          QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY,
        ],
        drop: (
          item: QueryBuilderExplorerTreeDragSource,
          monitor: DropTargetMonitor,
        ): void => {
          if (!monitor.didDrop()) {
            handleDrop(item);
          } // prevent drop event propagation to accomondate for nested DnD
        },
        collect: (monitor): { isPropertyDragOver: boolean } => ({
          isPropertyDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDrop],
    );
    return (
      <div
        className="panel__content dnd__overlay__container"
        ref={dropConnector}
      >
        <div className={clsx({ dnd__overlay: isPropertyDragOver })} />
        {!projectionColumns.length && (
          <BlankPanelPlaceholder
            placeholderText="Add a projection column"
            tooltipText="Drag and drop properties or calculated attributes here"
          />
        )}
        {Boolean(projectionColumns.length) && (
          <div
            data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PROJECTION}
            className="query-builder__projection__columns"
          >
            <ProjectionColumnDragLayer />
            {projectionColumns.map((projectionColumnState) => (
              <QueryBuilderProjectionColumn
                key={projectionColumnState.uuid}
                projectionColumnState={projectionColumnState}
                isRearrangingColumns={isRearrangingColumns}
              />
            ))}
          </div>
        )}
        <QueryResultModifierModal queryBuilderState={queryBuilderState} />
      </div>
    );
  },
);
