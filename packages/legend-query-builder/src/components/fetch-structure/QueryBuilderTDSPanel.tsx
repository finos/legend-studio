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
  PlusIcon,
  PanelContent,
  TrashIcon,
  PanelDnDEntry,
  PanelEntryDragHandle,
  CalendarIcon,
  CalendarClockIcon,
  CustomSelectorInput,
  PanelEntryDropZonePlaceholder,
  FunctionIcon,
  CogIcon,
} from '@finos/legend-art';
import {
  type QueryBuilderExplorerTreeDragSource,
  type QueryBuilderExplorerTreePropertyNodeData,
  buildPropertyExpressionFromExplorerTreeNodeData,
  QUERY_BUILDER_EXPLORER_TREE_DND_TYPE,
} from '../../stores/explorer/QueryBuilderExplorerState.js';
import {
  type DropTargetMonitor,
  useDrag,
  useDrop,
  useDragLayer,
} from 'react-dnd';
import {
  type QueryBuilderProjectionColumnDragSource,
  type QueryBuilderProjectionColumnState,
  QueryBuilderDerivationProjectionColumnState,
  QueryBuilderSimpleProjectionColumnState,
  QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE,
} from '../../stores/fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import { QueryBuilderPropertyExpressionBadge } from '../QueryBuilderPropertyExpressionEditor.js';
import { QueryResultModifierModal } from './QueryBuilderResultModifierPanel.js';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import { flowResult } from 'mobx';
import { useApplicationStore } from '@finos/legend-application';
import {
  type ConcreteFunctionDefinition,
  generateFunctionCallString,
  LAMBDA_PIPE,
  VARIABLE_REFERENCE_TOKEN,
  AbstractPropertyExpression,
  PRIMITIVE_TYPE,
  Property,
  PropertyExplicitReference,
  VariableExpression,
  Multiplicity,
  type ValueSpecification,
  PrimitiveType,
  GenericType,
  GenericTypeExplicitReference,
  observe_PrimitiveInstanceValue,
  PrimitiveInstanceValue,
} from '@finos/legend-graph';
import {
  type QueryBuilderFunctionsExplorerDragSource,
  QUERY_BUILDER_FUNCTION_DND_TYPE,
} from '../../stores/explorer/QueryFunctionsExplorerState.js';
import { DEFAULT_LAMBDA_VARIABLE_NAME } from '../../stores/QueryBuilderConfig.js';
import type { QueryBuilderAggregateOperator } from '../../stores/fetch-structure/tds/aggregation/QueryBuilderAggregateOperator.js';
import type { QueryBuilderTDSState } from '../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import { InlineLambdaEditor } from '../shared/LambdaEditor.js';
import {
  type QueryBuilderVariableDragSource,
  QUERY_BUILDER_VARIABLE_DND_TYPE,
  BasicValueSpecificationEditor,
} from '../shared/BasicValueSpecificationEditor.js';
import { type QueryBuilderAggregateCalendarFunction } from '../../stores/fetch-structure/tds/aggregation/QueryBuilderAggregateCalendarFunction.js';
import {
  instanceValue_setValues,
  propertyExpression_setFunc,
} from '../../stores/shared/ValueSpecificationModifierHelper.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { getPropertyChainName } from '../../stores/QueryBuilderPropertyEditorState.js';
import { generateDefaultValueForPrimitiveType } from '../../stores/QueryBuilderValueSpecificationHelper.js';
import { QUERY_BUILDER_CALENDAR_TYPE } from '../../graph-manager/QueryBuilderConst.js';

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
        <InlineLambdaEditor
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

type CalendarFunctionOption = {
  label: string | React.ReactNode;
  value: QueryBuilderAggregateCalendarFunction;
};

const buildCalendarFunctionOption = (
  calendarFunction: QueryBuilderAggregateCalendarFunction,
): CalendarFunctionOption => ({
  label: (
    <div
      className="query-builder__projection__calendar__function__label"
      title={calendarFunction.getLabel()}
    >
      <FunctionIcon className="query-builder__projection__calendar__function__label__icon" />
      <div className="query-builder__projection__calendar__function__label__title">
        {calendarFunction.getLabel()}
      </div>
    </div>
  ),
  value: calendarFunction,
});

type CalendarFunctionDateColumnOption = {
  label: React.ReactNode;
  value: AbstractPropertyExpression;
};

const buildCalendarFunctionDateColumnOption = (
  dateColumn: Property | AbstractPropertyExpression,
  parameter: VariableExpression,
  humanizeLabel: boolean,
): CalendarFunctionDateColumnOption => {
  if (dateColumn instanceof Property) {
    const propertyExpression = new AbstractPropertyExpression('');
    propertyExpression_setFunc(
      propertyExpression,
      PropertyExplicitReference.create(guaranteeNonNullable(dateColumn)),
    );
    propertyExpression.parametersValues = [parameter];
    return {
      label: getPropertyChainName(propertyExpression, humanizeLabel),
      value: propertyExpression,
    };
  } else {
    return {
      label: getPropertyChainName(dateColumn, humanizeLabel),
      value: dateColumn,
    };
  }
};

type CalendarTypeOption = {
  label: React.ReactNode;
  value: QUERY_BUILDER_CALENDAR_TYPE;
};

const buildCalendarTypeOption = (
  val: QUERY_BUILDER_CALENDAR_TYPE,
): CalendarTypeOption => ({
  label: (
    <div className="query-builder__projection__calendar__type__option">
      <CalendarIcon className="query-builder__projection__calendar__type__option__icon" />
      <div className="query-builder__projection__calendar__type__option__title">
        {val}
      </div>
    </div>
  ),
  value: val,
});

const QueryBuilderProjectionColumnEditor = observer(
  (props: {
    projectionColumnState: QueryBuilderProjectionColumnState;
    isRearrangeActive: boolean;
    currentRearrangeDraggedColumnIndex: number | undefined;
    setCurrentRearrangeDraggedColumnIndex: (val: number | undefined) => void;
    currentRearrangeDropGapIndex: number | undefined;
    setCurrentRearrangeDropGapIndex: (val: number | undefined) => void;
    columnIdx: number;
  }) => {
    const {
      isRearrangeActive,
      projectionColumnState,
      columnIdx,
      currentRearrangeDraggedColumnIndex,
      setCurrentRearrangeDraggedColumnIndex,
      currentRearrangeDropGapIndex,
      setCurrentRearrangeDropGapIndex,
    } = props;
    const dragHandleRef = useRef<HTMLDivElement>(null);
    const applicationStore = useApplicationStore();
    const ref = useRef<HTMLDivElement>(null);
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);

    const tdsState = projectionColumnState.tdsState;
    const isCalendarEnabled = tdsState.queryBuilderState.isCalendarEnabled;
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

    // calendar
    const aggregateCalendarFunctionDateColumns =
      tdsState.queryBuilderState.class?.properties.filter((p) => {
        const _type = p.genericType.value.rawType.name;
        if (
          _type === PRIMITIVE_TYPE.DATE ||
          _type === PRIMITIVE_TYPE.STRICTDATE
        ) {
          return true;
        }
        return false;
      }) ?? [];
    const calendarFunctionDateColumnOptions =
      aggregateCalendarFunctionDateColumns.map((option) =>
        buildCalendarFunctionDateColumnOption(
          option,
          new VariableExpression(
            aggregateColumnState?.calendarFunction?.lambdaParameterName ??
              DEFAULT_LAMBDA_VARIABLE_NAME,
            Multiplicity.ONE,
          ),
          tdsState.queryBuilderState.explorerState.humanizePropertyName,
        ),
      );
    const calendarTypeOptions = Object.values(QUERY_BUILDER_CALENDAR_TYPE).map(
      buildCalendarTypeOption,
    );
    const selectedCalendarTypeOption = aggregateColumnState?.calendarFunction
      ?.calendarType
      ? buildCalendarTypeOption(
          aggregateColumnState.calendarFunction.calendarType,
        )
      : null;
    const onCalendarTypeOptionChange = (option: CalendarTypeOption): void => {
      if (
        option.value !== aggregateColumnState?.calendarFunction?.calendarType
      ) {
        aggregateColumnState?.calendarFunction?.setCalendarType(option.value);
      }
    };

    const defaultEndDate = observe_PrimitiveInstanceValue(
      new PrimitiveInstanceValue(
        GenericTypeExplicitReference.create(
          new GenericType(PrimitiveType.STRICTDATE),
        ),
      ),
      tdsState.queryBuilderState.observerContext,
    );
    instanceValue_setValues(
      defaultEndDate,
      [generateDefaultValueForPrimitiveType(PRIMITIVE_TYPE.STRICTDATE)],
      tdsState.queryBuilderState.observerContext,
    );
    const resetEndDate = (): void => {
      if (aggregateColumnState?.calendarFunction) {
        aggregateColumnState.calendarFunction.setEndDate(defaultEndDate);
      }
    };
    const aggregateCalendarFunctions =
      tdsState.aggregationState.calendarFunctions.filter((cf) =>
        cf.isCompatibleWithColumn(projectionColumnState),
      );
    const calendarFunctionOptions = aggregateCalendarFunctions.map(
      buildCalendarFunctionOption,
    );
    const selectedCalendarFunctionOption =
      aggregateColumnState?.calendarFunction
        ? buildCalendarFunctionOption(aggregateColumnState.calendarFunction)
        : null;
    const onCalendarFunctionOptionChange = (
      option: CalendarFunctionOption | null,
    ): void => {
      if (option?.value !== aggregateColumnState?.calendarFunction) {
        const lambdaParameterName =
          aggregateColumnState?.calendarFunction?.lambdaParameterName;
        const dateColumn = aggregateColumnState?.calendarFunction?.dateColumn;
        const endDate = aggregateColumnState?.calendarFunction?.endDate;
        const calendarType =
          aggregateColumnState?.calendarFunction?.calendarType;
        aggregateColumnState?.setCalendarFunction(option?.value ?? undefined);
        const calendarFunction = aggregateColumnState?.calendarFunction;
        if (calendarFunction) {
          if (lambdaParameterName) {
            calendarFunction.setLambdaParameterName(lambdaParameterName);
          }
          if (dateColumn) {
            calendarFunction.setDateColumn(dateColumn);
          } else {
            if (calendarFunctionDateColumnOptions[0]) {
              calendarFunction.setDateColumn(
                guaranteeNonNullable(calendarFunctionDateColumnOptions[0])
                  .value,
              );
            } else {
              applicationStore.notificationService.notifyWarning(
                'Please provide a date attribute for the calendar function',
              );
            }
          }
          if (endDate) {
            calendarFunction.setEndDate(endDate);
          } else {
            calendarFunction.setEndDate(defaultEndDate);
          }
          if (calendarType) {
            calendarFunction.setCalendarType(calendarType);
          } else {
            calendarFunction.setCalendarType(
              guaranteeNonNullable(calendarTypeOptions[0]).value,
            );
          }
        }
      }
    };

    const handleDroppingColumn = useCallback(
      (type: string): void => {
        if (
          type === QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE &&
          currentRearrangeDropGapIndex !== undefined &&
          currentRearrangeDraggedColumnIndex !== undefined
        ) {
          tdsState.moveColumn(
            currentRearrangeDraggedColumnIndex,
            currentRearrangeDropGapIndex === tdsState.projectionColumns.length
              ? tdsState.projectionColumns.length - 1
              : currentRearrangeDropGapIndex,
          );
        }
        setCurrentRearrangeDraggedColumnIndex(undefined);
        setCurrentRearrangeDropGapIndex(undefined);
      },
      [
        tdsState,
        currentRearrangeDropGapIndex,
        currentRearrangeDraggedColumnIndex,
        setCurrentRearrangeDraggedColumnIndex,
        setCurrentRearrangeDropGapIndex,
      ],
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
        const hoveredRectangle = ref.current?.getBoundingClientRect();
        const hoveredRectangleMiddle =
          hoveredRectangle?.top && hoveredRectangle.bottom
            ? (hoveredRectangle.top + hoveredRectangle.bottom) / 2
            : undefined;
        const yCoordinate = monitor.getClientOffset()?.y ?? 0;

        if (yCoordinate && hoveredRectangleMiddle) {
          setCurrentRearrangeDropGapIndex(
            yCoordinate < hoveredRectangleMiddle ? columnIdx : columnIdx + 1,
          );
        }

        // move the item being hovered on when the dragged item position is beyond the its middle point
        const hoverBoundingReact = ref.current?.getBoundingClientRect();
        const distanceThreshold =
          ((hoverBoundingReact?.bottom ?? 0) - (hoverBoundingReact?.top ?? 0)) /
          2;
        const dragDistance = yCoordinate - (hoverBoundingReact?.top ?? 0);

        if (dragIndex === -1 || columnIdx === -1 || dragIndex === columnIdx) {
          return;
        }

        if (dragIndex < columnIdx && dragDistance < distanceThreshold) {
          return;
        }
        if (dragIndex > columnIdx && dragDistance > distanceThreshold) {
          return;
        }

        setCurrentRearrangeDraggedColumnIndex(dragIndex);
      },
      [
        tdsState,
        columnIdx,
        setCurrentRearrangeDropGapIndex,
        setCurrentRearrangeDraggedColumnIndex,
      ],
    );

    const [, dropConnector] = useDrop<QueryBuilderProjectionColumnDragSource>(
      () => ({
        accept: [QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE],
        hover: (item, monitor): void => handleHover(item, monitor),
        drop: (item, monitor): void => {
          if (!monitor.didDrop()) {
            handleDroppingColumn(monitor.getItemType() as string);
          }
        },
      }),
      [handleHover, handleDroppingColumn],
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

    dragConnector(dragHandleRef);
    dropConnector(ref);

    useDragPreviewLayer(dragPreviewConnector);

    const toggleHideCalendarColumnState = (): void => {
      if (aggregateColumnState) {
        aggregateColumnState.setHideCalendarColumnState(
          !aggregateColumnState.hideCalendarColumnState,
        );
      }
    };

    // Drag and Drop on calendar function date column
    const handleDrop = useCallback(
      (item: QueryBuilderExplorerTreeDragSource, type: string): void => {
        if (type === QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY) {
          if (
            item.node.type.name === PRIMITIVE_TYPE.DATE ||
            item.node.type.name === PRIMITIVE_TYPE.STRICTDATE
          ) {
            aggregateColumnState?.calendarFunction?.setDateColumn(
              buildPropertyExpressionFromExplorerTreeNodeData(
                item.node,
                tdsState.queryBuilderState.explorerState,
                aggregateColumnState.calendarFunction.lambdaParameterName,
              ),
            );
          } else {
            applicationStore.notificationService.notifyWarning(
              `${item.node.type.name} type is not compaible with calendar function date column`,
            );
          }
        }
      },
      [
        aggregateColumnState?.calendarFunction,
        applicationStore.notificationService,
        tdsState.queryBuilderState.explorerState,
      ],
    );
    const [{ isDragOver }, dropTargetConnector] = useDrop<
      QueryBuilderExplorerTreeDragSource,
      void,
      { isDragOver: boolean }
    >(
      () => ({
        accept: [QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY],
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

    return (
      <PanelDnDEntry
        ref={ref}
        placeholder={
          <div
            className={clsx(
              {
                'query-builder__projection__column__placeholder--bottom':
                  currentRearrangeDropGapIndex === columnIdx + 1 &&
                  columnIdx === tdsState.projectionColumns.length - 1,
              },
              {
                'query-builder__projection__column__placeholder--top':
                  currentRearrangeDropGapIndex === columnIdx,
              },
            )}
          />
        }
        showPlaceholder={
          projectionColumnBeingDragged !== undefined && isRearrangeActive
        }
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
          <div className="query-builder__projection__column__container">
            <PanelEntryDragHandle
              isDragging={false}
              dragSourceConnector={dragHandleRef}
              className="query-builder__projection__column__drag-handle__container"
            />
            <div className="query-builder__projection__column__name">
              <InputWithInlineValidation
                className="query-builder__projection__column__name__input input-group__input"
                spellCheck={false}
                value={projectionColumnState.columnName}
                onChange={changeColumnName}
                error={isDuplicatedColumnName ? 'Duplicated column' : undefined}
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
                {isCalendarEnabled &&
                  aggregateColumnState &&
                  aggregateCalendarFunctions.length > 0 && (
                    <div
                      className={clsx(
                        'query-builder__projection__column__aggregate__calendar__toggler',
                        {
                          'query-builder__projection__column__aggregate__calendar__toggler--active':
                            !aggregateColumnState.hideCalendarColumnState,
                        },
                      )}
                      onClick={toggleHideCalendarColumnState}
                      title="Toggle calendar aggregation"
                    >
                      <CalendarClockIcon />
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
          </div>
          {isCalendarEnabled &&
            aggregateColumnState &&
            aggregateCalendarFunctions.length > 0 && (
              <div
                className={clsx(
                  'query-builder__projection__calendar__container',
                  {
                    'query-builder__projection__calendar__container--hidden':
                      aggregateColumnState.hideCalendarColumnState,
                  },
                )}
              >
                <CustomSelectorInput
                  className="query-builder__projection__calendar__function"
                  options={calendarFunctionOptions}
                  onChange={onCalendarFunctionOptionChange}
                  value={selectedCalendarFunctionOption}
                  placeholder="Select Calendar Function"
                  isClearable={true}
                  escapeClearsValue={true}
                  darkMode={
                    !applicationStore.layoutService
                      .TEMPORARY__isLightColorThemeEnabled
                  }
                />
                <div className="query-builder__projection__calendar__value">
                  <BasicValueSpecificationEditor
                    valueSpecification={
                      aggregateColumnState.calendarFunction?.endDate ??
                      defaultEndDate
                    }
                    setValueSpecification={(val: ValueSpecification): void => {
                      if (val instanceof PrimitiveInstanceValue) {
                        aggregateColumnState.calendarFunction?.setEndDate(val);
                      }
                    }}
                    graph={tdsState.queryBuilderState.graphManagerState.graph}
                    obseverContext={tdsState.queryBuilderState.observerContext}
                    typeCheckOption={{
                      expectedType: PrimitiveType.STRICTDATE,
                    }}
                    className="query-builder__parameters__value__editor"
                    resetValue={resetEndDate}
                  />
                </div>
                <div
                  className="query-builder__projection__calendar__date__column"
                  ref={dropTargetConnector}
                >
                  <PanelEntryDropZonePlaceholder
                    isDragOver={isDragOver}
                    label="Change Date Column"
                    className="query-builder__projection__calendar__date__column__dnd__placeholder"
                  >
                    {aggregateColumnState.calendarFunction?.dateColumn ? (
                      <div className="query-builder__projection__calendar__date__column__label__box">
                        <div className="query-builder__projection__calendar__date__column__prefix">
                          on
                        </div>
                        <div className="query-builder__projection__calendar__date__column__label">
                          {getPropertyChainName(
                            aggregateColumnState.calendarFunction.dateColumn,
                            tdsState.queryBuilderState.explorerState
                              .humanizePropertyName,
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="query-builder__projection__calendar__date__column__placeholder">
                        Drag and drop date column here
                      </div>
                    )}
                  </PanelEntryDropZonePlaceholder>
                </div>
                <CustomSelectorInput
                  className="query-builder__projection__calendar__type"
                  options={calendarTypeOptions}
                  onChange={onCalendarTypeOptionChange}
                  value={selectedCalendarTypeOption ?? calendarTypeOptions[0]}
                  placeholder="Select calendar type"
                  disabled={!aggregateColumnState.calendarFunction}
                  darkMode={
                    !applicationStore.layoutService
                      .TEMPORARY__isLightColorThemeEnabled
                  }
                />
              </div>
            )}
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
    const isEmpty = tdsState.projectionColumns.length === 0;
    const [
      currentRearrangeDraggedColumnIndex,
      setCurrentRearrangeDraggedColumnIndex,
    ] = useState<number | undefined>();
    const [currentRearrangeDropGapIndex, setCurrentRearrangeDropGapIndex] =
      useState<number | undefined>();

    // Toolbar
    const openResultSetModifierEditor = (): void =>
      tdsState.resultSetModifierState.setShowModal(true);
    const addNewBlankDerivation = (): void => tdsState.addNewBlankDerivation();

    const clearAllProjectionColumns = (): void => {
      tdsState.checkBeforeClearingColumns(() => {
        tdsState.removeAllColumns();
        tdsState.resultSetModifierState.reset();
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

    const [{ isRearrangeActive }, rearrangeColumnDropConnector] = useDrop<
      QueryBuilderProjectionColumnDragSource,
      void,
      { isRearrangeActive: boolean }
    >(
      () => ({
        accept: [QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE],
        collect: (monitor) => ({
          isRearrangeActive: monitor.isOver({ shallow: false }),
        }),
      }),
      [],
    );

    const { isDroppable } = useDragLayer((monitor) => ({
      isDroppable:
        monitor.isDragging() &&
        [
          QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ENUM_PROPERTY,
          QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY,
          QUERY_BUILDER_FUNCTION_DND_TYPE,
        ].includes(monitor.getItemType()?.toString() ?? ''),
    }));

    useEffect(() => {
      flowResult(tdsState.convertDerivationProjectionObjects()).catch(
        applicationStore.alertUnhandledError,
      );
    }, [applicationStore, tdsState]);

    const addProjectionRef = useRef<HTMLInputElement>(null);
    dropTargetConnector(addProjectionRef);

    return (
      <PanelContent>
        <div className="query-builder__projection__toolbar">
          <div
            className="query-builder__projection__result-modifier-prompt"
            data-testid={
              QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS_RESULT_MODIFIER_PROMPT
            }
          >
            <div className="query-builder__projection__result-modifier-prompt__header">
              <button
                className="query-builder__projection__result-modifier-prompt__header__label"
                onClick={openResultSetModifierEditor}
                title="Configure result set modifiers..."
              >
                <CogIcon className="query-builder__projection__result-modifier-prompt__header__label__icon" />
                <div className="query-builder__projection__result-modifier-prompt__header__label__title">
                  Query Options
                </div>
              </button>
            </div>
            {tdsState.resultSetModifierState.limit && (
              <div className="query-builder__projection__result-modifier-prompt__group">
                <div className="query-builder__projection__result-modifier-prompt__group__label">
                  Max Rows
                </div>
                <div
                  className="query-builder__projection__result-modifier-prompt__group__content"
                  onClick={openResultSetModifierEditor}
                >
                  {tdsState.resultSetModifierState.limit}
                </div>
              </div>
            )}
            {tdsState.resultSetModifierState.distinct && (
              <div className="query-builder__projection__result-modifier-prompt__group">
                <div className="query-builder__projection__result-modifier-prompt__group__label">
                  Eliminate Duplicate Rows
                </div>
                <div
                  className="query-builder__projection__result-modifier-prompt__group__content"
                  onClick={openResultSetModifierEditor}
                >
                  Yes
                </div>
              </div>
            )}
            {tdsState.resultSetModifierState.sortColumns.length > 0 && (
              <div className="query-builder__projection__result-modifier-prompt__group">
                <div className="query-builder__projection__result-modifier-prompt__group__label">
                  Sort
                </div>
                {tdsState.resultSetModifierState.sortColumns.map(
                  (columnState) => (
                    <div
                      className="query-builder__projection__result-modifier-prompt__group__content"
                      key={columnState.columnState.uuid}
                      onClick={openResultSetModifierEditor}
                    >
                      {`${columnState.columnState.columnName} ${columnState.sortType}`}
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
          <div className="query-builder__projection__toolbar__actions">
            <button
              className="panel__header__action"
              disabled={isEmpty}
              onClick={clearAllProjectionColumns}
              tabIndex={-1}
              title={
                isEmpty
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
        </div>
        <div className="query-builder__projection__content">
          <PanelDropZone
            isDragOver={isDragOver && isEmpty}
            isDroppable={isDroppable && isEmpty}
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
                <div ref={rearrangeColumnDropConnector}>
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
                  {projectionColumns.map((projectionColumnState, columnIdx) => (
                    <QueryBuilderProjectionColumnEditor
                      key={projectionColumnState.uuid}
                      projectionColumnState={projectionColumnState}
                      isRearrangeActive={isRearrangeActive}
                      currentRearrangeDraggedColumnIndex={
                        currentRearrangeDraggedColumnIndex
                      }
                      currentRearrangeDropGapIndex={
                        currentRearrangeDropGapIndex
                      }
                      setCurrentRearrangeDraggedColumnIndex={
                        setCurrentRearrangeDraggedColumnIndex
                      }
                      setCurrentRearrangeDropGapIndex={
                        setCurrentRearrangeDropGapIndex
                      }
                      columnIdx={columnIdx}
                    />
                  ))}
                </div>
              </div>
            )}
            {isDroppable && !isEmpty && (
              <div
                ref={addProjectionRef}
                className="query-builder-filter-tree__free-drop-zone__container"
              >
                <PanelEntryDropZonePlaceholder
                  isDragOver={isDragOver}
                  isDroppable={isDroppable}
                  className="query-builder-filter-tree__free-drop-zone"
                  label="Add a projection column"
                >
                  <></>
                </PanelEntryDropZonePlaceholder>
              </div>
            )}
            <QueryResultModifierModal tdsState={tdsState} />
          </PanelDropZone>
        </div>
      </PanelContent>
    );
  },
);
