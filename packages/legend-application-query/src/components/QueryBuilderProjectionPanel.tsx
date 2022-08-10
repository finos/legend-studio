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

import { useEffect, useRef, useCallback, useState, forwardRef } from 'react';
import { observer } from 'mobx-react-lite';
import {
  clsx,
  BlankPanelPlaceholder,
  TimesIcon,
  DropdownMenu,
  MenuContent,
  MenuContentItem,
  CaretDownIcon,
  VerticalDragHandleIcon,
  ContextMenu,
  InputWithInlineValidation,
  SigmaIcon,
  TimesCircleIcon,
} from '@finos/legend-art';
import {
  type QueryBuilderExplorerTreeDragSource,
  type QueryBuilderExplorerTreePropertyNodeData,
  buildPropertyExpressionFromExplorerTreeNodeData,
  QUERY_BUILDER_EXPLORER_TREE_DND_TYPE,
} from '../stores/QueryBuilderExplorerState.js';
import {
  type DropTargetMonitor,
  type XYCoord,
  useDragLayer,
  useDrag,
  useDrop,
} from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import {
  type QueryBuilderProjectionColumnDragSource,
  type QueryBuilderProjectionColumnState,
  QueryBuilderDerivationProjectionColumnState,
  QueryBuilderSimpleProjectionColumnState,
  QUERY_BUILDER_PROJECTION_DND_TYPE,
  QueryBuilderProjectionState,
} from '../stores/QueryBuilderProjectionState.js';
import { QueryBuilderPropertyExpressionBadge } from './QueryBuilderPropertyExpressionEditor.js';
import type { QueryBuilderState } from '../stores/QueryBuilderState.js';
import { QueryResultModifierModal } from './QueryBuilderResultModifierPanel.js';
import { QUERY_BUILDER_TEST_ID } from './QueryBuilder_TestID.js';
import type { QueryBuilderAggregateOperator } from '../stores/QueryBuilderAggregationState.js';
import { flowResult } from 'mobx';
import { QueryBuilderLambdaEditor } from './QueryBuilderLambdaEditor.js';
import { useApplicationStore } from '@finos/legend-application';
import {
  type QueryBuilderParameterDragSource,
  QUERY_BUILDER_PARAMETER_TREE_DND_TYPE,
} from '../stores/QueryParametersState.js';
import {
  type ConcreteFunctionDefinition,
  generateFunctionCallString,
  LAMBDA_PIPE,
  VARIABLE_REFERENCE_TOKEN,
} from '@finos/legend-graph';
import {
  type QueryBuilderFunctionsExplorerDragSource,
  QUERY_BUILDER_FUNCTIONS_EXPLORER_TREE_DND_TYPE,
} from '../stores/QueryFunctionsExplorerState.js';
import { DEFAULT_LAMBDA_VARIABLE_NAME } from '../QueryBuilder_Const.js';
import { QueryBuilderPostFilterTreeConditionNodeData } from '../stores/QueryBuilderPostFilterState.js';
import { filterByType } from '@finos/legend-shared';

const ProjectionColumnDragLayer: React.FC = () => {
  const { itemType, item, isDragging, currentPosition } = useDragLayer(
    (monitor) => ({
      itemType: monitor.getItemType(),
      item: monitor.getItem<QueryBuilderProjectionColumnDragSource | null>(),
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

const QueryBuilderProjectionColumnContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      projectionColumnState: QueryBuilderProjectionColumnState;
    }
  >(function QueryBuilderProjectionColumnContextMenu(props, ref) {
    const { projectionColumnState } = props;
    const removeColumn = (): void =>
      projectionColumnState.projectionState.removeColumn(projectionColumnState);
    const convertToDerivation = (): void => {
      if (
        projectionColumnState instanceof QueryBuilderSimpleProjectionColumnState
      ) {
        projectionColumnState.projectionState.transformSimpleProjectionToDerivation(
          projectionColumnState,
        );
      }
    };

    return (
      <MenuContent ref={ref}>
        {projectionColumnState instanceof
          QueryBuilderSimpleProjectionColumnState && (
          <MenuContentItem onClick={convertToDerivation}>
            Convert To Derivation
          </MenuContentItem>
        )}
        <MenuContentItem onClick={removeColumn}>Remove</MenuContentItem>
      </MenuContent>
    );
  }),
);

const QueryBuilderSimpleProjectionColumnEditor = observer(
  (props: {
    projectionColumnState: QueryBuilderSimpleProjectionColumnState;
  }) => {
    const { projectionColumnState } = props;
    const onPropertyExpressionChange = (
      node: QueryBuilderExplorerTreePropertyNodeData,
    ): void =>
      projectionColumnState.changeProperty(
        node,
        projectionColumnState.projectionState.queryBuilderState.explorerState
          .humanizePropertyName,
      );

    return (
      <div className="query-builder__projection__column__value__property">
        <QueryBuilderPropertyExpressionBadge
          propertyExpressionState={
            projectionColumnState.propertyExpressionState
          }
          onPropertyExpressionChange={onPropertyExpressionChange}
        />
      </div>
    );
  },
);

const QueryBuilderDerivationProjectionColumnEditor = observer(
  (props: {
    projectionColumnState: QueryBuilderDerivationProjectionColumnState;
  }) => {
    const { projectionColumnState } = props;
    const hasParserError = projectionColumnState.projectionState.hasParserError;

    const handleDrop = useCallback(
      (
        item:
          | QueryBuilderExplorerTreeDragSource
          | QueryBuilderParameterDragSource
          | QueryBuilderFunctionsExplorerDragSource,
        type: string,
      ): void => {
        if (type === QUERY_BUILDER_PARAMETER_TREE_DND_TYPE.VARIABLE) {
          projectionColumnState.derivationLambdaEditorState.setLambdaString(
            `${
              projectionColumnState.derivationLambdaEditorState.lambdaString
            }${VARIABLE_REFERENCE_TOKEN}${
              (item as QueryBuilderParameterDragSource).variable.variableName
            }`,
          );
        } else if (
          type === QUERY_BUILDER_FUNCTIONS_EXPLORER_TREE_DND_TYPE.FUNCTION
        ) {
          projectionColumnState.derivationLambdaEditorState.setLambdaString(
            `${
              projectionColumnState.derivationLambdaEditorState.lambdaString
            }${`${generateFunctionCallString(
              (item as QueryBuilderFunctionsExplorerDragSource).node
                .packageableElement as ConcreteFunctionDefinition,
            )}`}`,
          );
        } else {
          projectionColumnState.derivationLambdaEditorState.setLambdaString(
            projectionColumnState.derivationLambdaEditorState.lambdaString +
              (item as QueryBuilderExplorerTreeDragSource).node.dndText,
          );
        }
      },
      [projectionColumnState],
    );
    const [, dropConnector] = useDrop(
      () => ({
        accept: [
          QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ROOT,
          QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.CLASS_PROPERTY,
          QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ENUM_PROPERTY,
          QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY,
          QUERY_BUILDER_PARAMETER_TREE_DND_TYPE.VARIABLE,
          QUERY_BUILDER_FUNCTIONS_EXPLORER_TREE_DND_TYPE.FUNCTION,
        ],
        drop: (
          item:
            | QueryBuilderExplorerTreeDragSource
            | QueryBuilderParameterDragSource
            | QueryBuilderFunctionsExplorerDragSource,
          monitor,
        ): void => {
          if (!monitor.didDrop()) {
            handleDrop(item, monitor.getItemType() as string);
          } // prevent drop event propagation to accomondate for nested DnD
        },
      }),
      [handleDrop],
    );

    return (
      <div
        ref={dropConnector}
        className={clsx(
          'query-builder__lambda-editor__container query-builder__projection__column__derivation',
          { backdrop__element: hasParserError },
        )}
      >
        <QueryBuilderLambdaEditor
          className="query-builder__lambda-editor"
          queryBuilderState={
            projectionColumnState.projectionState.queryBuilderState
          }
          disabled={
            projectionColumnState.projectionState
              .isConvertDerivationProjectionObjects
          }
          lambdaEditorState={projectionColumnState.derivationLambdaEditorState}
          forceBackdrop={hasParserError}
        />
      </div>
    );
  },
);

const QueryBuilderProjectionColumnEditor = observer(
  (props: {
    projectionColumnState: QueryBuilderProjectionColumnState;
    isRearrangingColumns: boolean;
  }) => {
    const ref = useRef<HTMLDivElement>(null);

    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);

    const { projectionColumnState, isRearrangingColumns } = props;
    const queryBuilderState =
      projectionColumnState.projectionState.queryBuilderState;
    const projectionState =
      queryBuilderState.fetchStructureState.projectionState;

    const isRemovalDisabled = Array.from(
      queryBuilderState.postFilterState.nodes.values(),
    )
      .filter(filterByType(QueryBuilderPostFilterTreeConditionNodeData))
      .map((n) => n.condition.columnState)
      .includes(projectionColumnState);

    const removeColumn = (): void =>
      projectionState.removeColumn(projectionColumnState);

    // name
    const changeColumnName: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => projectionColumnState.setColumnName(event.target.value);
    const isDuplicatedColumnName =
      projectionColumnState.projectionState.columns.filter(
        (column) => column.columnName === projectionColumnState.columnName,
      ).length > 1;

    // aggregation
    const aggregateColumnState = projectionState.aggregationState.columns.find(
      (column) => column.projectionColumnState === projectionColumnState,
    );
    const aggreateOperators = projectionState.aggregationState.operators.filter(
      (op) => op.isCompatibleWithColumn(projectionColumnState),
    );
    const changeOperator =
      (val: QueryBuilderAggregateOperator | undefined) => (): void =>
        projectionState.aggregationState.changeColumnAggregateOperator(
          val,
          projectionColumnState,
        );

    // Drag and Drop
    const handleHover = useCallback(
      (
        item: QueryBuilderProjectionColumnDragSource,
        monitor: DropTargetMonitor,
      ): void => {
        const dragIndex = projectionState.columns.findIndex(
          (e) => e === item.columnState,
        );
        const hoverIndex = projectionState.columns.findIndex(
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
        projectionState.moveColumn(dragIndex, hoverIndex);
      },
      [projectionColumnState, projectionState],
    );
    const [, dropConnector] = useDrop(
      () => ({
        accept: [QUERY_BUILDER_PROJECTION_DND_TYPE.PROJECTION_COLUMN],
        hover: (
          item: QueryBuilderProjectionColumnDragSource,
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
          <div className="query-builder__projection__column__dnd__placeholder__container">
            <div className="query-builder__dnd__placeholder query-builder__projection__column__dnd__placeholder" />
          </div>
        )}
        {!projectionColumnState.isBeingDragged && (
          <ContextMenu
            content={
              <QueryBuilderProjectionColumnContextMenu
                projectionColumnState={projectionColumnState}
              />
            }
            disabled={
              !(
                projectionColumnState instanceof
                QueryBuilderSimpleProjectionColumnState
              )
            }
            className={clsx('query-builder__projection__column__context-menu', {
              'query-builder__projection__column--selected-from-context-menu':
                isSelectedFromContextMenu,
            })}
            menuProps={{ elevation: 7 }}
            onOpen={onContextMenuOpen}
            onClose={onContextMenuClose}
          >
            <div className="query-builder__projection__column__dnd__indicator">
              <div className="query-builder__projection__column__dnd__indicator__handler">
                <VerticalDragHandleIcon />
              </div>
            </div>
            <div className="query-builder__projection__column__name">
              <InputWithInlineValidation
                className="query-builder__projection__column__name__input input-group__input"
                spellCheck={false}
                value={projectionColumnState.columnName}
                onChange={changeColumnName}
                validationErrorMessage={
                  isDuplicatedColumnName ? 'Duplicated column' : undefined
                }
              />
            </div>
            <div className="query-builder__projection__column__value">
              {projectionColumnState instanceof
                QueryBuilderSimpleProjectionColumnState && (
                <QueryBuilderSimpleProjectionColumnEditor
                  projectionColumnState={projectionColumnState}
                />
              )}
              {projectionColumnState instanceof
                QueryBuilderDerivationProjectionColumnState && (
                <QueryBuilderDerivationProjectionColumnEditor
                  projectionColumnState={projectionColumnState}
                />
              )}
            </div>
            <div className="query-builder__projection__column__aggregate">
              <div className="query-builder__projection__column__aggregate__operator">
                {aggregateColumnState && (
                  <div className="query-builder__projection__column__aggregate__operator__label">
                    {aggregateColumnState.operator.getLabel(
                      projectionColumnState,
                    )}
                  </div>
                )}

                <DropdownMenu
                  className="query-builder__projection__column__aggregate__operator__dropdown"
                  disabled={!aggreateOperators.length}
                  content={
                    <MenuContent>
                      {aggregateColumnState && (
                        <MenuContentItem
                          className="query-builder__projection__column__aggregate__operator__dropdown__option"
                          onClick={changeOperator(undefined)}
                        >
                          (none)
                        </MenuContentItem>
                      )}
                      {aggreateOperators.map((op) => (
                        <MenuContentItem
                          key={op.uuid}
                          className="query-builder__projection__column__aggregate__operator__dropdown__option"
                          onClick={changeOperator(op)}
                        >
                          {op.getLabel(projectionColumnState)}
                        </MenuContentItem>
                      ))}
                    </MenuContent>
                  }
                  menuProps={{
                    anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
                    transformOrigin: { vertical: 'top', horizontal: 'left' },
                    elevation: 7,
                  }}
                >
                  <button
                    className={clsx(
                      'query-builder__projection__column__aggregate__operator__badge',
                      {
                        'query-builder__projection__column__aggregate__operator__badge--activated':
                          Boolean(aggregateColumnState),
                      },
                    )}
                    tabIndex={-1}
                    title="Choose Aggregate Operator..."
                  >
                    <SigmaIcon />
                  </button>
                  <button
                    className="query-builder__projection__column__aggregate__operator__dropdown__trigger"
                    tabIndex={-1}
                    title="Choose Aggregate Operator..."
                  >
                    <CaretDownIcon />
                  </button>
                </DropdownMenu>
              </div>
            </div>
            <div className="query-builder__projection__column__actions">
              <button
                className="query-builder__projection__column__action"
                tabIndex={-1}
                onClick={removeColumn}
                disabled={isRemovalDisabled}
                title={
                  isRemovalDisabled
                    ? "This column is used in the post filter and can't be removed"
                    : 'Remove'
                }
              >
                <TimesIcon />
              </button>
            </div>
          </ContextMenu>
        )}
      </div>
    );
  },
);

const ProjectionError = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const projectionState =
      queryBuilderState.fetchStructureState.projectionState;

    return (
      <div className="notification__message__content__icon--error">
        <div className="query-builder__projection__error__label">
          <TimesCircleIcon className="query-builder__projection__error__icon" />
          {projectionState.getValidationErrorMessage()}
        </div>
      </div>
    );
  },
);

export const QueryBuilderProjectionPanel = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const applicationStore = useApplicationStore();
    const { queryBuilderState } = props;
    const projectionState =
      queryBuilderState.fetchStructureState.projectionState;
    const projectionColumns = projectionState.columns;
    // Drag and Drop
    const isRearrangingColumns = projectionColumns.some(
      (columnState) => columnState.isBeingDragged,
    );
    const handleDrop = useCallback(
      (
        item:
          | QueryBuilderExplorerTreeDragSource
          | QueryBuilderFunctionsExplorerDragSource,
        type: string,
      ): void => {
        switch (type) {
          case QUERY_BUILDER_FUNCTIONS_EXPLORER_TREE_DND_TYPE.FUNCTION: {
            const derivationProjectionColumn =
              new QueryBuilderDerivationProjectionColumnState(
                projectionState,
                queryBuilderState.graphManagerState.graphManager.HACKY__createDefaultBlankLambda(),
              );
            derivationProjectionColumn.derivationLambdaEditorState.setLambdaString(
              `${DEFAULT_LAMBDA_VARIABLE_NAME}${LAMBDA_PIPE}${generateFunctionCallString(
                (item as QueryBuilderFunctionsExplorerDragSource).node
                  .packageableElement as ConcreteFunctionDefinition,
              )}`,
            );
            projectionState.addColumn(derivationProjectionColumn);
            break;
          }
          case QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ENUM_PROPERTY:
          case QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY:
            projectionState.addColumn(
              new QueryBuilderSimpleProjectionColumnState(
                projectionState,
                buildPropertyExpressionFromExplorerTreeNodeData(
                  queryBuilderState.explorerState.nonNullableTreeData,
                  (item as QueryBuilderExplorerTreeDragSource).node,
                  projectionState.queryBuilderState.graphManagerState.graph,
                  queryBuilderState.explorerState.propertySearchPanelState
                    .allMappedPropertyNodes,
                ),
                queryBuilderState.explorerState.humanizePropertyName,
              ),
            );
            break;
          default:
            break;
        }
      },
      [queryBuilderState, projectionState],
    );

    const isInvalidProjection = !projectionState.isValidProjectionState();
    const [{ isPropertyDragOver }, dropConnector] = useDrop(
      () => ({
        accept: [
          QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ENUM_PROPERTY,
          QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY,
          QUERY_BUILDER_FUNCTIONS_EXPLORER_TREE_DND_TYPE.FUNCTION,
        ],
        drop: (
          item:
            | QueryBuilderExplorerTreeDragSource
            | QueryBuilderFunctionsExplorerDragSource,
          monitor: DropTargetMonitor,
        ): void => {
          if (!monitor.didDrop()) {
            handleDrop(item, monitor.getItemType() as string);
          } // prevent drop event propagation to accomondate for nested DnD
        },
        collect: (monitor): { isPropertyDragOver: boolean } => ({
          isPropertyDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDrop],
    );

    useEffect(() => {
      flowResult(projectionState.convertDerivationProjectionObjects()).catch(
        applicationStore.alertUnhandledError,
      );
    }, [applicationStore, projectionState]);

    return (
      <div
        ref={dropConnector}
        className={`panel__content dnd__overlay__container`}
      >
        <div className={clsx({ projection__error: isInvalidProjection })}>
          {projectionState.getValidationErrorMessage() && (
            <ProjectionError queryBuilderState={queryBuilderState} />
          )}
        </div>

        <div className={clsx({ dnd__overlay: isPropertyDragOver })} />

        {!projectionColumns.length && (
          <BlankPanelPlaceholder
            placeholderText="Add a projection column"
            tooltipText="Drag and drop properties here"
          />
        )}
        {Boolean(projectionColumns.length) && (
          <div
            data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PROJECTION}
            // className="query-builder__projection__columns"

            className={`query-builder__projection__columns ${clsx({
              projection__padding: isInvalidProjection,
            })} `}
          >
            <ProjectionColumnDragLayer />
            {projectionColumns.map((projectionColumnState) => (
              <QueryBuilderProjectionColumnEditor
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
