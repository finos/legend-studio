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
  ContextMenu,
  InputWithInlineValidation,
  SigmaIcon,
  PanelDropZone,
  DragPreviewLayer,
  useDragPreviewLayer,
  OptionsIcon,
  PlusIcon,
  PanelContent,
  TrashIcon,
  PanelDnDEntry,
  PanelDnDEntryDragHandle,
} from '@finos/legend-art';
import {
  type QueryBuilderExplorerTreeDragSource,
  type QueryBuilderExplorerTreePropertyNodeData,
  buildPropertyExpressionFromExplorerTreeNodeData,
  QUERY_BUILDER_EXPLORER_TREE_DND_TYPE,
} from '../../stores/explorer/QueryBuilderExplorerState.js';
import { type DropTargetMonitor, useDrag, useDrop } from 'react-dnd';
import {
  type QueryBuilderProjectionColumnDragSource,
  type QueryBuilderProjectionColumnState,
  QueryBuilderDerivationProjectionColumnState,
  QueryBuilderSimpleProjectionColumnState,
  QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE,
} from '../../stores/fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import { QueryBuilderPropertyExpressionBadge } from '../QueryBuilderPropertyExpressionEditor.js';
import { QueryResultModifierModal } from './QueryBuilderResultModifierPanel.js';
import { QUERY_BUILDER_TEST_ID } from '../../application/QueryBuilderTesting.js';
import { flowResult } from 'mobx';
import { useApplicationStore } from '@finos/legend-application';
import {
  type ConcreteFunctionDefinition,
  generateFunctionCallString,
  LAMBDA_PIPE,
  VARIABLE_REFERENCE_TOKEN,
} from '@finos/legend-graph';
import {
  type QueryBuilderFunctionsExplorerDragSource,
  QUERY_BUILDER_FUNCTION_DND_TYPE,
} from '../../stores/explorer/QueryFunctionsExplorerState.js';
import { DEFAULT_LAMBDA_VARIABLE_NAME } from '../../stores/QueryBuilderConfig.js';
import type { QueryBuilderAggregateOperator } from '../../stores/fetch-structure/tds/aggregation/QueryBuilderAggregateOperator.js';
import type { QueryBuilderTDSState } from '../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import { LambdaEditor } from '../shared/LambdaEditor.js';
import {
  type QueryBuilderVariableDragSource,
  QUERY_BUILDER_VARIABLE_DND_TYPE,
} from '../shared/BasicValueSpecificationEditor.js';

const QueryBuilderProjectionColumnContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      projectionColumnState: QueryBuilderProjectionColumnState;
    }
  >(function QueryBuilderProjectionColumnContextMenu(props, ref) {
    const { projectionColumnState } = props;
    const removeColumn = (): void =>
      projectionColumnState.tdsState.removeColumn(projectionColumnState);
    const convertToDerivation = (): void => {
      if (
        projectionColumnState instanceof QueryBuilderSimpleProjectionColumnState
      ) {
        projectionColumnState.tdsState.transformSimpleProjectionToDerivation(
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
        projectionColumnState.tdsState.queryBuilderState.explorerState
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
    const hasParserError = projectionColumnState.tdsState.hasParserError;

    const handleDrop = useCallback(
      (
        item:
          | QueryBuilderExplorerTreeDragSource
          | QueryBuilderVariableDragSource
          | QueryBuilderFunctionsExplorerDragSource,
        type: string,
      ): void => {
        if (type === QUERY_BUILDER_VARIABLE_DND_TYPE) {
          projectionColumnState.derivationLambdaEditorState.setLambdaString(
            `${
              projectionColumnState.derivationLambdaEditorState.lambdaString
            }${VARIABLE_REFERENCE_TOKEN}${
              (item as QueryBuilderVariableDragSource).variable.name
            }`,
          );
        } else if (type === QUERY_BUILDER_FUNCTION_DND_TYPE) {
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
    const [, dropConnector] = useDrop<
      | QueryBuilderExplorerTreeDragSource
      | QueryBuilderVariableDragSource
      | QueryBuilderFunctionsExplorerDragSource
    >(
      () => ({
        accept: [
          QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ROOT,
          QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.CLASS_PROPERTY,
          QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ENUM_PROPERTY,
          QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY,
          QUERY_BUILDER_VARIABLE_DND_TYPE,
          QUERY_BUILDER_FUNCTION_DND_TYPE,
        ],
        drop: (item, monitor): void => {
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
        <LambdaEditor
          className="query-builder__lambda-editor"
          disabled={
            projectionColumnState.tdsState.isConvertDerivationProjectionObjects
          }
          lambdaEditorState={projectionColumnState.derivationLambdaEditorState}
          forceBackdrop={hasParserError}
        />
      </div>
    );
  },
);

const QueryBuilderProjectionColumnEditor = observer(
  (props: { projectionColumnState: QueryBuilderProjectionColumnState }) => {
    const handleRef = useRef<HTMLDivElement>(null);
    const ref = useRef<HTMLDivElement>(null);
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);

    const { projectionColumnState } = props;
    const tdsState = projectionColumnState.tdsState;
    const isRemovalDisabled = tdsState.isColumnInUse(projectionColumnState);

    const removeColumn = (): void =>
      tdsState.removeColumn(projectionColumnState);

    // name
    const changeColumnName: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => projectionColumnState.setColumnName(event.target.value);
    const isDuplicatedColumnName =
      projectionColumnState.tdsState.isDuplicateColumn(projectionColumnState);

    // aggregation
    const aggregateColumnState = tdsState.aggregationState.columns.find(
      (column) => column.projectionColumnState === projectionColumnState,
    );
    const aggreateOperators = tdsState.aggregationState.operators.filter((op) =>
      op.isCompatibleWithColumn(projectionColumnState),
    );
    const changeOperator =
      (val: QueryBuilderAggregateOperator | undefined) => (): void =>
        tdsState.aggregationState.changeColumnAggregateOperator(
          val,
          projectionColumnState,
        );

    // Drag and Drop
    const handleHover = useCallback(
      (
        item: QueryBuilderProjectionColumnDragSource,
        monitor: DropTargetMonitor,
      ): void => {
        const dragIndex = tdsState.projectionColumns.findIndex(
          (e) => e === item.columnState,
        );
        const hoverIndex = tdsState.projectionColumns.findIndex(
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
          (monitor.getClientOffset()?.y ?? 0) - (hoverBoundingReact?.top ?? 0);
        if (dragIndex < hoverIndex && dragDistance < distanceThreshold) {
          return;
        }
        if (dragIndex > hoverIndex && dragDistance > distanceThreshold) {
          return;
        }
        tdsState.moveColumn(dragIndex, hoverIndex);
      },
      [projectionColumnState, tdsState],
    );
    const [, dropConnector] = useDrop<QueryBuilderProjectionColumnDragSource>(
      () => ({
        accept: [QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE],
        hover: (item, monitor): void => handleHover(item, monitor),
      }),
      [handleHover],
    );
    const [
      { projectionColumnBeingDragged },
      dragConnector,
      dragPreviewConnector,
    ] = useDrag<
      QueryBuilderProjectionColumnDragSource,
      void,
      {
        projectionColumnBeingDragged:
          | QueryBuilderProjectionColumnState
          | undefined;
      }
    >(
      () => ({
        type: QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE,
        item: () => ({
          columnState: projectionColumnState,
        }),
        collect: (monitor) => ({
          /**
           * @workaround typings - https://github.com/react-dnd/react-dnd/pull/3484
           */
          projectionColumnBeingDragged:
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            (monitor.getItem() as QueryBuilderProjectionColumnDragSource | null)
              ?.columnState,
        }),
      }),
      [projectionColumnState],
    );
    const isBeingDragged =
      projectionColumnState === projectionColumnBeingDragged;
    dragConnector(handleRef);
    dropConnector(ref);

    useDragPreviewLayer(dragPreviewConnector);

    return (
      <PanelDnDEntry
        dndRef={ref}
        showPlaceholder={isBeingDragged}
        className="query-builder__projection__column"
      >
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
          <PanelDnDEntryDragHandle
            isBeingDragged={isBeingDragged}
            dropTargetConnector={handleRef}
            className="query-builder__projection__column__drag-handle__container"
          />
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
                title="Choose Aggregate Operator..."
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
                <div
                  className={clsx(
                    'query-builder__projection__column__aggregate__operator__badge',
                    {
                      'query-builder__projection__column__aggregate__operator__badge--activated':
                        Boolean(aggregateColumnState),
                    },
                  )}
                >
                  <SigmaIcon />
                </div>
                <div className="query-builder__projection__column__aggregate__operator__dropdown__trigger">
                  <CaretDownIcon />
                </div>
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
                  ? // TODO: We may want to provide a list of all places where column is in use
                    "This column is used and can't be removed"
                  : 'Remove'
              }
            >
              <TimesIcon />
            </button>
          </div>
        </ContextMenu>
      </PanelDnDEntry>
    );
  },
);

export const QueryBuilderTDSPanel = observer(
  (props: { tdsState: QueryBuilderTDSState }) => {
    const applicationStore = useApplicationStore();
    const { tdsState } = props;
    const projectionColumns = tdsState.projectionColumns;

    // Toolbar
    const openResultSetModifierEditor = (): void =>
      tdsState.resultSetModifierState.setShowModal(true);
    const addNewBlankDerivation = (): void => tdsState.addNewBlankDerivation();

    const clearAllProjectionColumns = (): void => {
      tdsState.checkBeforeClearingColumns(() => {
        tdsState.removeAllColumns();
      });
    };

    // Drag and Drop
    const handleDrop = useCallback(
      (
        item:
          | QueryBuilderExplorerTreeDragSource
          | QueryBuilderFunctionsExplorerDragSource,
        type: string,
      ): void => {
        switch (type) {
          case QUERY_BUILDER_FUNCTION_DND_TYPE: {
            const derivationProjectionColumn =
              new QueryBuilderDerivationProjectionColumnState(
                tdsState,
                tdsState.queryBuilderState.graphManagerState.graphManager.createDefaultBasicRawLambda(
                  { addDummyParameter: true },
                ),
              );
            derivationProjectionColumn.derivationLambdaEditorState.setLambdaString(
              `${DEFAULT_LAMBDA_VARIABLE_NAME}${LAMBDA_PIPE}${generateFunctionCallString(
                (item as QueryBuilderFunctionsExplorerDragSource).node
                  .packageableElement as ConcreteFunctionDefinition,
              )}`,
            );
            tdsState.addColumn(derivationProjectionColumn);
            break;
          }
          case QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ENUM_PROPERTY:
          case QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY:
            tdsState.addColumn(
              new QueryBuilderSimpleProjectionColumnState(
                tdsState,
                buildPropertyExpressionFromExplorerTreeNodeData(
                  (item as QueryBuilderExplorerTreeDragSource).node,
                  tdsState.queryBuilderState.explorerState,
                ),
                tdsState.queryBuilderState.explorerState.humanizePropertyName,
              ),
            );
            break;
          default:
            break;
        }
      },
      [tdsState],
    );

    const [{ isDragOver }, dropTargetConnector] = useDrop<
      | QueryBuilderExplorerTreeDragSource
      | QueryBuilderFunctionsExplorerDragSource,
      void,
      { isDragOver: boolean }
    >(
      () => ({
        accept: [
          QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ENUM_PROPERTY,
          QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY,
          QUERY_BUILDER_FUNCTION_DND_TYPE,
        ],
        drop: (item, monitor): void => {
          if (!monitor.didDrop()) {
            handleDrop(item, monitor.getItemType() as string);
          } // prevent drop event propagation to accomondate for nested DnD
        },
        collect: (monitor) => ({
          isDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDrop],
    );

    useEffect(() => {
      flowResult(tdsState.convertDerivationProjectionObjects()).catch(
        applicationStore.alertUnhandledError,
      );
    }, [applicationStore, tdsState]);

    return (
      <PanelContent>
        <div className="query-builder__projection__toolbar">
          <button
            className="panel__header__action"
            onClick={openResultSetModifierEditor}
            tabIndex={-1}
            title="Configure result set modifiers..."
          >
            <OptionsIcon className="query-builder__icon query-builder__icon__query-option" />
          </button>
          <button
            className="panel__header__action"
            disabled={tdsState.projectionColumns.length < 1}
            onClick={clearAllProjectionColumns}
            tabIndex={-1}
            title={
              tdsState.projectionColumns.length < 1
                ? 'No projection columns to clear'
                : 'Clear all projection columns'
            }
          >
            <TrashIcon className="query-builder__icon query-builder__icon__query-option--small" />
          </button>
          <button
            className="panel__header__action"
            onClick={addNewBlankDerivation}
            tabIndex={-1}
            title="Add a new derivation"
          >
            <PlusIcon />
          </button>
        </div>
        <div className="query-builder__projection__content">
          <PanelDropZone
            isDragOver={isDragOver}
            dropTargetConnector={dropTargetConnector}
          >
            {!projectionColumns.length && (
              <BlankPanelPlaceholder
                text="Add a projection column"
                tooltipText="Drag and drop properties here"
              />
            )}
            {Boolean(projectionColumns.length) && (
              <div
                data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS}
                className="query-builder__projection__columns"
              >
                <DragPreviewLayer
                  labelGetter={(
                    item: QueryBuilderProjectionColumnDragSource,
                  ): string =>
                    item.columnState.columnName === ''
                      ? '(unknown)'
                      : item.columnState.columnName
                  }
                  types={[QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE]}
                />
                {projectionColumns.map((projectionColumnState) => (
                  <QueryBuilderProjectionColumnEditor
                    key={projectionColumnState.uuid}
                    projectionColumnState={projectionColumnState}
                  />
                ))}
              </div>
            )}
            <QueryResultModifierModal tdsState={tdsState} />
          </PanelDropZone>
        </div>
      </PanelContent>
    );
  },
);
