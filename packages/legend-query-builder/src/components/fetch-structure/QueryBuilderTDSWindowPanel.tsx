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

import { useApplicationStore } from '@finos/legend-application';
import {
  PlusIcon,
  PanelContent,
  PanelDropZone,
  BlankPanelPlaceholder,
  DropdownMenu,
  InputWithInlineValidation,
  MenuContent,
  MenuContentItem,
  SigmaIcon,
  CaretDownIcon,
  clsx,
  PanelEntryDropZonePlaceholder,
  ContextMenu,
  TimesIcon,
  useDragPreviewLayer,
  SortIcon,
  Dialog,
  CustomSelectorInput,
  WindowIcon,
  BasePopover,
  EditIcon,
  ModalHeader,
  Modal,
  ModalFooter,
  PanelFormSection,
  ModalFooterButton,
  PanelEntryDragHandle,
  PanelDnDEntry,
  PanelHeaderActionItem,
  PanelHeader,
  PanelHeaderActions,
  Panel,
} from '@finos/legend-art';
import { assertErrorThrown, guaranteeNonNullable } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { forwardRef, useCallback, useRef, useState } from 'react';
import { type DropTargetMonitor, useDrag, useDrop } from 'react-dnd';
import type { QueryBuilderTDS_WindowOperator } from '../../stores/fetch-structure/tds/window/operators/QueryBuilderTDS_WindowOperator.js';
import {
  type QueryBuilderWindowState,
  type QueryBuilderWindowDropTarget,
  type QueryBuilderWindowColumnDragSource,
  QueryBuilderWindowColumnState,
  QueryBuilderTDS_WindowRankOperatorState,
  QueryBuilderTDS_WindowAggreationOperatorState,
  QUERY_BUILDER_WINDOW_COLUMN_DND_TYPE,
} from '../../stores/fetch-structure/tds/window/QueryBuilderWindowState.js';
import { QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE } from '../../stores/fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import type { QueryBuilderTDSColumnState } from '../../stores/fetch-structure/tds/QueryBuilderTDSColumnState.js';
import type { QueryBuilderTDSState } from '../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import { COLUMN_SORT_TYPE } from '../../stores/fetch-structure/tds/QueryResultSetModifierState.js';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import { QueryBuilderPanelIssueCountBadge } from '../shared/QueryBuilderPanelIssueCountBadge.js';

// helpers
const createWindowColumnState = (
  columnState: QueryBuilderTDSColumnState,
  tdsState: QueryBuilderTDSState,
): QueryBuilderWindowColumnState => {
  const operator = tdsState.windowState.operators.filter(
    (o) =>
      o.isColumnAggregator() &&
      o.isCompatibleWithType(columnState.getColumnType()),
  )[0];
  const nonColoperator = guaranteeNonNullable(
    tdsState.windowState.operators.filter((o) => !o.isColumnAggregator())[0],
  );
  if (operator) {
    const opState = new QueryBuilderTDS_WindowAggreationOperatorState(
      tdsState.windowState,
      operator,
      columnState,
    );
    return new QueryBuilderWindowColumnState(
      tdsState.windowState,
      [],
      undefined,
      opState,
      `${operator.getLabel()} ${columnState.columnName}`,
    );
  } else {
    return new QueryBuilderWindowColumnState(
      tdsState.windowState,
      [columnState],
      undefined,
      new QueryBuilderTDS_WindowRankOperatorState(
        tdsState.windowState,
        nonColoperator,
      ),
      `${nonColoperator.getLabel()} ${columnState.columnName}`,
    );
  }
};

const QueryBuilderWindowColumnContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      columnState: QueryBuilderWindowColumnState;
    }
  >(function QueryBuilderWindowGroupByColumnContextMenu(props, ref) {
    const { columnState } = props;
    const editColumn = (): void =>
      columnState.windowState.setEditColumn(columnState);
    const removeColumn = (): void =>
      columnState.windowState.removeColumn(columnState);

    return (
      <MenuContent ref={ref}>
        <MenuContentItem onClick={editColumn}>Open Editor</MenuContentItem>
        <MenuContentItem onClick={removeColumn}>Remove</MenuContentItem>
      </MenuContent>
    );
  }),
);

const TDSColumnSelectorEditor = observer(
  (props: {
    colValue: QueryBuilderTDSColumnState;
    tdsColOptions: QueryBuilderTDSColumnState[];
    setColumn: (val: QueryBuilderTDSColumnState) => void;
    deleteColumn: (val: QueryBuilderTDSColumnState) => void;
  }) => {
    const { tdsColOptions, colValue, setColumn, deleteColumn } = props;
    const applicationStore = useApplicationStore();
    const options = tdsColOptions.map((col) => ({
      label: col.columnName,
      value: col,
    }));
    const value = {
      label: colValue.columnName,
      value: colValue,
    };
    const onChange = (
      val: { label: string; value: QueryBuilderTDSColumnState } | null,
    ): void => {
      if (val !== null) {
        setColumn(val.value);
      }
    };
    const removeColumn = (): void => deleteColumn(colValue);

    return (
      <div className="panel__content__form__section__list__item query-builder__projection__options__sort">
        <CustomSelectorInput
          className="query-builder__projection__options__sort__dropdown"
          options={options}
          disabled={options.length < 1}
          onChange={onChange}
          value={value}
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        />
        <button
          className="query-builder__olap__tds__column__remove-btn btn--dark btn--caution"
          onClick={removeColumn}
          tabIndex={-1}
          title="Remove"
        >
          <TimesIcon />
        </button>
      </div>
    );
  },
);

const QueryBuilderWindowColumnModalEditor = observer(
  (props: {
    windowState: QueryBuilderWindowState;
    windowColumnState: QueryBuilderWindowColumnState;
  }) => {
    const { windowState, windowColumnState } = props;
    const createNewWindow =
      !windowState.windowColumns.includes(windowColumnState);
    const tdsState = windowState.tdsState;
    const applicationStore = useApplicationStore();
    const close = (): void => {
      windowState.setEditColumn(undefined);
    };
    const isDuplicatedColumnName = !windowState.windowColumns.includes(
      windowColumnState,
    )
      ? windowState.tdsState.tdsColumns
          .map((c) => c.columnName)
          .includes(windowColumnState.columnName)
      : windowState.tdsState.isDuplicateColumn(windowColumnState);
    const windowOptions = createNewWindow
      ? tdsState.tdsColumns
      : windowColumnState.possibleReferencedColumns;
    const windowOptionsLabels = windowOptions.map((w) => ({
      label: w.columnName,
      value: w,
    }));
    // column Name
    const changeColumnName: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => windowColumnState.setColumnName(event.target.value);
    // operator
    const operators = windowState.operators;
    const operationState = windowColumnState.operationState;
    const windowOpColumn =
      operationState instanceof QueryBuilderTDS_WindowAggreationOperatorState
        ? operationState.columnState
        : undefined;
    const changeOperatorCol = (
      val: { label: string; value: QueryBuilderTDSColumnState } | null,
    ): void => {
      if (
        operationState instanceof QueryBuilderTDS_WindowAggreationOperatorState
      ) {
        if (val !== null) {
          operationState.setColumnState(val.value);
        }
      }
    };
    const changeOperator =
      (olapOp: QueryBuilderTDS_WindowOperator) => (): void => {
        windowColumnState.changeOperator(olapOp);
      };
    // window
    const addOptions = windowOptions.filter(
      (e) => !windowColumnState.windowColumns.includes(e),
    );
    const create = (): void => {
      windowState.addWindowColumn(windowColumnState);
      close();
    };
    const addWindowValue = (): void => {
      if (addOptions.length > 0) {
        windowColumnState.addWindow(guaranteeNonNullable(addOptions[0]));
      }
    };
    // sortby
    const sortByState = windowColumnState.sortByState;
    const changeSortBy = (sortOp: COLUMN_SORT_TYPE | undefined) => (): void => {
      windowColumnState.changeSortBy(sortOp);
    };
    const changeSortCol = (
      val: { label: string; value: QueryBuilderTDSColumnState } | null,
    ): void => {
      if (sortByState) {
        if (val !== null) {
          sortByState.setColumnState(val.value);
        }
      }
    };
    return (
      <Dialog
        open={Boolean(windowState.editColumn)}
        onClose={close}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <Modal
          darkMode={true}
          className={clsx([
            'query-builder__olap__modal',
            {
              'query-editor--light':
                applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled,
            },
          ])}
        >
          <ModalHeader
            title={
              createNewWindow
                ? 'Create Window Function Column'
                : 'Update Window Function Column'
            }
          />
          <div className="query-builder__olap__modal__body">
            <PanelFormSection>
              <div className="panel__content__form__section__header__label">
                Window Operator
              </div>
              <div className="panel__content__form__section__header__prompt">
                Window aggregation function to apply and column if required by
                function
              </div>
              <div className="panel__content__form__section__list">
                <div className="panel__content__form__section__list__items">
                  <div className="query-builder__olap__column__operation__operator">
                    <div
                      className={clsx(
                        'query-builder__olap__column__operation__operator__label',
                        {
                          'query-builder__olap__column__operation__operator__label__agg':
                            !windowOpColumn,
                        },
                      )}
                    >
                      {operationState.operator.getLabel()}
                    </div>
                    {windowOpColumn && (
                      <div className="panel__content__form__section__list__item query-builder__olap__tds__column__options">
                        <CustomSelectorInput
                          className="query-builder__olap__tds__column__dropdown"
                          options={windowOptionsLabels}
                          disabled={windowOptionsLabels.length < 1}
                          onChange={changeOperatorCol}
                          value={{
                            value: windowOpColumn,
                            label: windowOpColumn.columnName,
                          }}
                          darkMode={
                            !applicationStore.layoutService
                              .TEMPORARY__isLightColorThemeEnabled
                          }
                        />
                      </div>
                    )}
                    <DropdownMenu
                      className="query-builder__olap__column__operation__operator__dropdown"
                      disabled={!operators.length}
                      content={
                        <MenuContent>
                          {operators.map((op) => (
                            <MenuContentItem
                              key={op.uuid}
                              className="query-builder__olap__column__operation__operator__dropdown__option"
                              onClick={changeOperator(op)}
                            >
                              {op.getLabel()}
                            </MenuContentItem>
                          ))}
                        </MenuContent>
                      }
                      menuProps={{
                        anchorOrigin: {
                          vertical: 'bottom',
                          horizontal: 'left',
                        },
                        transformOrigin: {
                          vertical: 'top',
                          horizontal: 'left',
                        },
                        elevation: 7,
                      }}
                    >
                      <div
                        className="query-builder__olap__column__operation__operator__badge"
                        title="Choose Window Function Operator..."
                      >
                        <SigmaIcon />
                      </div>
                      <div
                        className="query-builder__olap__column__operation__operator__dropdown__trigger"
                        title="Choose Window Function Operator..."
                      >
                        <CaretDownIcon />
                      </div>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </PanelFormSection>
            <PanelFormSection>
              <div className="panel__content__form__section__header__label">
                Window Columns
              </div>
              <div className="panel__content__form__section__header__prompt">
                Represents the window of columns that will partition the rows
                for which to apply the aggragte function
              </div>
              <div className="panel__content__form__section__list">
                <div className="panel__content__form__section__list__items">
                  {windowColumnState.windowColumns.map((value, idx) => (
                    <TDSColumnSelectorEditor
                      key={value.uuid}
                      colValue={value}
                      setColumn={(v: QueryBuilderTDSColumnState) =>
                        windowColumnState.changeWindow(v, idx)
                      }
                      deleteColumn={(v: QueryBuilderTDSColumnState): void =>
                        windowColumnState.deleteWindow(v)
                      }
                      tdsColOptions={windowOptions}
                    />
                  ))}
                </div>
                <div className="panel__content__form__section__list__new-item__add">
                  <button
                    className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                    disabled={!addOptions.length}
                    onClick={addWindowValue}
                    tabIndex={-1}
                  >
                    Add Value
                  </button>
                </div>
              </div>
            </PanelFormSection>
            <PanelFormSection>
              <div className="panel__content__form__section__header__label">
                Sort By
              </div>
              <div className="panel__content__form__section__header__prompt">
                Orders by the designated column
              </div>
              <div className="panel__content__form__section__header__prompt"></div>
              <div className="panel__content__form__section__list">
                <div className="query-builder__olap__column__sortby__operator">
                  {sortByState && (
                    <div className="query-builder__olap__column__sortby__operator__label">
                      {sortByState.sortType.toLowerCase()}
                    </div>
                  )}
                  {sortByState && (
                    <div className="panel__content__form__section__list__item query-builder__olap__tds__column__options">
                      <CustomSelectorInput
                        className="query-builder__olap__tds__column__dropdown"
                        options={windowOptionsLabels}
                        disabled={windowOptionsLabels.length < 1}
                        onChange={changeSortCol}
                        value={{
                          value: sortByState.columnState,
                          label: sortByState.columnState.columnName,
                        }}
                        darkMode={
                          !applicationStore.layoutService
                            .TEMPORARY__isLightColorThemeEnabled
                        }
                      />
                    </div>
                  )}
                  {!sortByState && (
                    <div className="query-builder__olap__column__sortby__none">
                      (none)
                    </div>
                  )}
                  <DropdownMenu
                    className="query-builder__olap__column__sortby__operator__dropdown"
                    content={
                      <MenuContent>
                        <MenuContentItem
                          key="none"
                          className="query-builder__olap__column__sortby__operator__dropdown__option"
                          onClick={changeSortBy(undefined)}
                        >
                          (none)
                        </MenuContentItem>

                        {Object.values(COLUMN_SORT_TYPE).map((op) => (
                          <MenuContentItem
                            key={op}
                            className="query-builder__olap__column__sortby__operator__dropdown__option"
                            onClick={changeSortBy(op)}
                          >
                            {op.toLowerCase()}
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
                        'query-builder__olap__column__sortby__operator__badge',
                        {
                          'query-builder__olap__column__sortby__operator__badge--activated':
                            Boolean(sortByState),
                        },
                      )}
                      tabIndex={-1}
                      title="Choose Window Function SortBy Operator..."
                    >
                      <SortIcon />
                    </div>
                    <div
                      className="query-builder__olap__column__sortby__operator__dropdown__trigger"
                      tabIndex={-1}
                      title="Choose Window Function SortBy Operator..."
                    >
                      <CaretDownIcon />
                    </div>
                  </DropdownMenu>
                </div>
              </div>
            </PanelFormSection>

            <PanelFormSection>
              <div className="panel__content__form__section__header__label">
                Window Function Column Name
              </div>
              <div className="panel__content__form__section__header__prompt">
                Name of Window Function Column that will be part of TDS Result
              </div>
              <InputWithInlineValidation
                className="query-builder__olap__column__name__input input-group__input"
                spellCheck={false}
                value={windowColumnState.columnName}
                onChange={changeColumnName}
                error={isDuplicatedColumnName ? 'Duplicated column' : undefined}
              />
            </PanelFormSection>
          </div>
          <ModalFooter>
            {createNewWindow ? (
              <ModalFooterButton text="Create" onClick={create} />
            ) : (
              <ModalFooterButton text="Close" onClick={close} />
            )}
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

const TDSColumnReferenceEditor = observer(
  (props: {
    tdsColumn: QueryBuilderTDSColumnState;
    handleChange: (val: QueryBuilderTDSColumnState) => void;
    selectionEditor?: {
      options: QueryBuilderTDSColumnState[];
    };
  }) => {
    const { handleChange, tdsColumn, selectionEditor } = props;
    const applicationStore = useApplicationStore();
    const [opAnchor, setOpAnchor] = useState<HTMLButtonElement | null>(null);
    const openOpAnchor = (event: React.MouseEvent<HTMLButtonElement>): void => {
      if (selectionEditor) {
        setOpAnchor(event.currentTarget);
      }
    };
    const closeOpAnchor = (): void => {
      setOpAnchor(null);
    };

    const value = {
      label: tdsColumn.columnName,
      value: tdsColumn,
    };

    const options =
      selectionEditor?.options.map((col) => ({
        label: col.columnName,
        value: col,
      })) ?? [];
    const onChange = (
      val: { label: string; value: QueryBuilderTDSColumnState } | null,
    ): void => {
      if (val !== null) {
        handleChange(val.value);
      }
    };

    const handleDrop = useCallback(
      (item: QueryBuilderWindowColumnDragSource): void => {
        handleChange(item.columnState);
      },
      [handleChange],
    );
    const [{ isDragOver }, dropOpConnector] = useDrop<
      QueryBuilderWindowColumnDragSource,
      void,
      { isDragOver: boolean }
    >(
      () => ({
        accept: [
          QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE,
          QUERY_BUILDER_WINDOW_COLUMN_DND_TYPE,
        ],
        drop: (item, monitor): void => {
          if (!monitor.didDrop()) {
            handleDrop(item);
          }
        },
        collect: (monitor) => ({
          isDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDrop],
    );

    return (
      <>
        <button
          onClick={openOpAnchor}
          className="query-builder__olap__tds__column"
        >
          <div
            ref={dropOpConnector}
            className="query-builder__olap__tds__column-badge"
          >
            <PanelEntryDropZonePlaceholder
              isDragOver={isDragOver}
              label="Change Column"
            >
              <div className="query-builder__olap__tds__column-badge__content">
                <div
                  className="query-builder__olap__tds__column-badge__property"
                  title={`${tdsColumn.columnName}`}
                >
                  {tdsColumn.columnName}
                </div>
              </div>
            </PanelEntryDropZonePlaceholder>
          </div>
        </button>
        {selectionEditor && (
          <BasePopover
            open={Boolean(opAnchor)}
            anchorEl={opAnchor}
            onClose={closeOpAnchor}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'center',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'center',
            }}
          >
            <div className="query-builder__olap__column__window__popover">
              <div className="panel__content__form__section__list__item query-builder__olap__tds__column__options">
                <CustomSelectorInput
                  className="query-builder__projection__options__sort__dropdown"
                  options={options}
                  disabled={options.length < 1}
                  onChange={onChange}
                  value={value}
                  darkMode={
                    !applicationStore.layoutService
                      .TEMPORARY__isLightColorThemeEnabled
                  }
                />
              </div>
            </div>
          </BasePopover>
        )}
      </>
    );
  },
);

const QueryBuilderWindowColumnEditor = observer(
  (props: { windowColumnState: QueryBuilderWindowColumnState }) => {
    const { windowColumnState } = props;
    const windowState = windowColumnState.windowState;
    const tdsState = windowState.tdsState;
    const operators = windowState.operators;
    // state
    const ref = useRef<HTMLDivElement>(null);
    const handleRef = useRef<HTMLDivElement>(null);

    const [windowAnchor, setWindowAnchor] = useState<HTMLButtonElement | null>(
      null,
    );
    const openWindowPopover = (
      event: React.MouseEvent<HTMLButtonElement>,
    ): void => {
      setWindowAnchor(event.currentTarget);
    };
    const closeWindowPopover = (): void => {
      setWindowAnchor(null);
    };
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);

    // column Name
    const changeColumnName: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => windowColumnState.setColumnName(event.target.value);
    const isDuplicatedColumnName =
      tdsState.isDuplicateColumn(windowColumnState);

    const isInvalidColumnName = windowState.invalidWindowColumnNames.some(
      (col) =>
        col.invalidColumnName === windowColumnState.columnName ||
        col.missingColumnName === windowColumnState.columnName,
    );

    // window columns
    const windowOptions = windowColumnState.possibleReferencedColumns;
    const addWindowOptions = windowOptions.filter(
      (e) => !windowColumnState.windowColumns.includes(e),
    );
    const addWindowValue = (): void => {
      if (addWindowOptions.length > 0) {
        windowColumnState.addWindow(guaranteeNonNullable(addWindowOptions[0]));
      }
    };

    // operator
    const operationState = windowColumnState.operationState;
    const aggregateColumn =
      operationState instanceof QueryBuilderTDS_WindowAggreationOperatorState
        ? operationState.columnState
        : undefined;

    const changeOperator =
      (olapOp: QueryBuilderTDS_WindowOperator) => (): void => {
        windowColumnState.changeOperator(olapOp);
      };

    // sortby
    const sortByState = windowColumnState.sortByState;
    const changeSortBy = (sortOp: COLUMN_SORT_TYPE | undefined) => (): void => {
      windowColumnState.changeSortBy(sortOp);
    };

    // action
    const isRemovalDisabled =
      windowState.tdsState.isColumnInUse(windowColumnState);
    const removeColumn = (): void => {
      windowColumnState.windowState.removeColumn(windowColumnState);
    };
    const editoColumn = (): void => {
      windowState.setEditColumn(windowColumnState);
    };

    // Drag and Drop
    const handleHover = useCallback(
      (
        item: QueryBuilderWindowColumnDragSource,
        monitor: DropTargetMonitor,
      ): void => {
        const dragIndex = tdsState.windowState.windowColumns.findIndex(
          (e) => e === item.columnState,
        );
        const hoverIndex = tdsState.windowState.windowColumns.findIndex(
          (e) => e === windowColumnState,
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
        windowState.moveColumn(dragIndex, hoverIndex);
      },
      [windowColumnState, windowState, tdsState.windowState.windowColumns],
    );
    const [, dropConnector] = useDrop<QueryBuilderWindowColumnDragSource>(
      () => ({
        accept: [QUERY_BUILDER_WINDOW_COLUMN_DND_TYPE],
        hover: (item, monitor): void => handleHover(item, monitor),
      }),
      [handleHover],
    );
    const [{ olapColumnBeingDragged }, dragConnector, dragPreviewConnector] =
      useDrag<
        QueryBuilderWindowColumnDragSource,
        void,
        {
          olapColumnBeingDragged: QueryBuilderTDSColumnState | undefined;
        }
      >(
        () => ({
          type: QUERY_BUILDER_WINDOW_COLUMN_DND_TYPE,
          item: () => ({
            columnState: windowColumnState,
          }),
          collect: (monitor) => ({
            /**
             * @workaround typings - https://github.com/react-dnd/react-dnd/pull/3484
             */
            olapColumnBeingDragged:
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
              (monitor.getItem() as QueryBuilderWindowColumnDragSource | null)
                ?.columnState,
          }),
        }),
        [windowColumnState],
      );
    const isBeingDragged = windowColumnState === olapColumnBeingDragged;
    dragConnector(handleRef);
    dropConnector(ref);
    useDragPreviewLayer(dragPreviewConnector);

    const handleOpDrop = (val: QueryBuilderTDSColumnState): void => {
      if (
        operationState instanceof QueryBuilderTDS_WindowAggreationOperatorState
      ) {
        operationState.setColumnState(val);
      }
    };
    const handleSortDrop = (val: QueryBuilderTDSColumnState): void => {
      if (sortByState) {
        sortByState.setColumnState(val);
      }
    };
    const handleWindowDrop = useCallback(
      (item: QueryBuilderWindowColumnDragSource): void => {
        const colState = item.columnState;
        if (
          windowColumnState.possibleReferencedColumns.includes(colState) &&
          !windowColumnState.windowColumns.includes(colState)
        ) {
          windowColumnState.addWindow(colState);
        }
      },
      [windowColumnState],
    );
    const [{ isDragOver }, dropOpConnector] = useDrop<
      QueryBuilderWindowColumnDragSource,
      void,
      { isDragOver: boolean }
    >(
      () => ({
        accept: [
          QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE,
          QUERY_BUILDER_WINDOW_COLUMN_DND_TYPE,
        ],
        drop: (item, monitor): void => {
          if (!monitor.didDrop()) {
            handleWindowDrop(item);
          }
        },
        collect: (monitor) => ({
          isDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleWindowDrop],
    );

    return (
      <PanelDnDEntry
        ref={ref}
        className="query-builder__olap__column"
        showPlaceholder={isBeingDragged}
      >
        <ContextMenu
          content={
            <QueryBuilderWindowColumnContextMenu
              columnState={windowColumnState}
            />
          }
          className={clsx('query-builder__olap__column__context-menu', {
            'query-builder__olap__column--selected-from-context-menu':
              isSelectedFromContextMenu,
          })}
          menuProps={{ elevation: 7 }}
          onOpen={onContextMenuOpen}
          onClose={onContextMenuClose}
        >
          <PanelEntryDragHandle
            isDragging={isBeingDragged}
            className="query-builder__olap__column__drag-handle__container"
            dragSourceConnector={handleRef}
          />
          <div className="query-builder__olap__column__operation">
            <div className="query-builder__olap__column__operation__operator">
              <div
                className={clsx(
                  'query-builder__olap__column__operation__operator__label',
                  {
                    'query-builder__olap__column__operation__operator__label__agg':
                      !aggregateColumn,
                  },
                )}
              >
                {operationState.operator.getLabel()}
              </div>
              {aggregateColumn && (
                <TDSColumnReferenceEditor
                  tdsColumn={aggregateColumn}
                  handleChange={handleOpDrop}
                  selectionEditor={{
                    options: windowColumnState.possibleReferencedColumns,
                  }}
                />
              )}
              <DropdownMenu
                className="query-builder__olap__column__operation__operator__dropdown"
                disabled={!operators.length}
                content={
                  <MenuContent>
                    {operators.map((op) => (
                      <MenuContentItem
                        key={op.uuid}
                        className="query-builder__olap__column__operation__operator__dropdown__option"
                        onClick={changeOperator(op)}
                      >
                        {op.getLabel()}
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
                  className="query-builder__olap__column__operation__operator__badge"
                  title="Choose Window Function Operator..."
                >
                  <SigmaIcon />
                </div>
                <div
                  className="query-builder__olap__column__operation__operator__dropdown__trigger"
                  title="Choose Window Function Operator..."
                >
                  <CaretDownIcon />
                </div>
              </DropdownMenu>
            </div>
          </div>
          <div className="query-builder__olap__column__window">
            <button
              ref={dropOpConnector}
              title="Click to edit or drag and drop columns"
              onClick={openWindowPopover}
              className="query-builder__olap__column__window__content"
            >
              <PanelEntryDropZonePlaceholder
                isDragOver={isDragOver}
                label="Add"
              >
                <div
                  title={`${windowColumnState.windowColumns.length} columns partitioned`}
                  className="query-builder__olap__column__window__content__label"
                >
                  ({windowColumnState.windowColumns.length})
                </div>
                <div
                  className={clsx(
                    'query-builder__olap__column__window__operator__badge',
                  )}
                  tabIndex={-1}
                  title="Edit window columns..."
                >
                  <WindowIcon />
                </div>
              </PanelEntryDropZonePlaceholder>
            </button>
            <BasePopover
              open={Boolean(windowAnchor)}
              anchorEl={windowAnchor}
              onClose={closeWindowPopover}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'center',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'center',
              }}
            >
              <div className="query-builder__olap__column__window__popover">
                <div className="panel__content__form__section__list">
                  <div className="panel__content__form__section__list__items">
                    {windowColumnState.windowColumns.map((value, idx) => (
                      <TDSColumnSelectorEditor
                        key={value.uuid}
                        colValue={value}
                        setColumn={(v: QueryBuilderTDSColumnState) =>
                          windowColumnState.changeWindow(v, idx)
                        }
                        deleteColumn={(v: QueryBuilderTDSColumnState): void =>
                          windowColumnState.deleteWindow(v)
                        }
                        tdsColOptions={windowOptions}
                      />
                    ))}
                  </div>
                  <div className="panel__content__form__section__list__new-item__add">
                    <button
                      className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                      disabled={!addWindowOptions.length}
                      onClick={addWindowValue}
                      tabIndex={-1}
                    >
                      Add Value
                    </button>
                  </div>
                </div>
              </div>
            </BasePopover>
          </div>
          <div className="query-builder__olap__column__sortby">
            <div className="query-builder__olap__column__sortby__operator">
              {sortByState && (
                <div className="query-builder__olap__column__sortby__operator__label">
                  {sortByState.sortType.toLowerCase()}
                </div>
              )}
              {sortByState && (
                <TDSColumnReferenceEditor
                  tdsColumn={sortByState.columnState}
                  handleChange={handleSortDrop}
                  selectionEditor={{
                    options: windowColumnState.possibleReferencedColumns,
                  }}
                />
              )}
              {!sortByState && (
                <div className="query-builder__olap__column__sortby__none">
                  (none)
                </div>
              )}
              <DropdownMenu
                className="query-builder__olap__column__sortby__operator__dropdown"
                content={
                  <MenuContent>
                    <MenuContentItem
                      key="none"
                      className="query-builder__olap__column__sortby__operator__dropdown__option"
                      onClick={changeSortBy(undefined)}
                    >
                      (none)
                    </MenuContentItem>

                    {Object.values(COLUMN_SORT_TYPE).map((op) => (
                      <MenuContentItem
                        key={op}
                        className="query-builder__olap__column__sortby__operator__dropdown__option"
                        onClick={changeSortBy(op)}
                      >
                        {op.toLowerCase()}
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
                    'query-builder__olap__column__sortby__operator__badge',
                    {
                      'query-builder__olap__column__sortby__operator__badge--activated':
                        Boolean(sortByState),
                    },
                  )}
                  title="Choose Window Function SortBy Operator..."
                >
                  <SortIcon />
                </div>
                <div
                  className="query-builder__olap__column__sortby__operator__dropdown__trigger"
                  title="Choose Window Function SortBy Operator..."
                >
                  <CaretDownIcon />
                </div>
              </DropdownMenu>
            </div>
          </div>
          <div className="query-builder__olap__column__name">
            <InputWithInlineValidation
              className="query-builder__olap__column__name__input input-group__input"
              spellCheck={false}
              value={windowColumnState.columnName}
              onChange={changeColumnName}
              error={
                isDuplicatedColumnName
                  ? 'Duplicated column'
                  : isInvalidColumnName
                  ? 'Invalid column order'
                  : undefined
              }
            />
          </div>
          <div className="query-builder__olap__column__actions">
            <button
              className="query-builder__olap__column__action"
              tabIndex={-1}
              onClick={editoColumn}
            >
              <EditIcon />
            </button>
            <button
              className="query-builder__olap__column__action"
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
      </PanelDnDEntry>
    );
  },
);

export const QueryBuilderTDSWindowPanel = observer(
  (props: { tdsWindowState: QueryBuilderWindowState }) => {
    const { tdsWindowState } = props;
    const applicationStore = useApplicationStore();
    const createTDSWindow = (): void => {
      const col = tdsWindowState.tdsState.tdsColumns[0];
      if (col) {
        const newWindowState = createWindowColumnState(
          col,
          tdsWindowState.tdsState,
        );
        tdsWindowState.setEditColumn(newWindowState);
      }
    };
    // Drag and Drop
    const handleDrop = useCallback(
      async (item: QueryBuilderWindowDropTarget): Promise<void> => {
        try {
          const newWindowState = createWindowColumnState(
            item.columnState,
            tdsWindowState.tdsState,
          );
          tdsWindowState.addWindowColumn(newWindowState);
        } catch (error) {
          assertErrorThrown(error);
          applicationStore.notificationService.notifyError(error.message);
          return;
        }
      },
      [applicationStore, tdsWindowState],
    );
    const [{ isDragOver }, dropTargetConnector] = useDrop<
      QueryBuilderWindowDropTarget,
      void,
      { isDragOver: boolean }
    >(
      () => ({
        accept: [
          QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE,
          QUERY_BUILDER_WINDOW_COLUMN_DND_TYPE,
        ],
        drop: (item, monitor): void => {
          if (!monitor.didDrop()) {
            handleDrop(item).catch(applicationStore.alertUnhandledError);
          } // prevent drop event propagation to accomondate for nested DnD
        },
        collect: (monitor) => ({
          isDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [applicationStore, handleDrop],
    );
    return (
      <Panel>
        <div
          data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_WINDOW_GROUPBY}
          className="panel"
        >
          <PanelHeader>
            <div className="panel__header__title">
              <div className="panel__header__title__label">window function</div>
              {tdsWindowState.windowValidationIssues.length > 0 && (
                <QueryBuilderPanelIssueCountBadge
                  issues={tdsWindowState.windowValidationIssues}
                />
              )}
            </div>
            <PanelHeaderActions>
              <PanelHeaderActionItem
                onClick={createTDSWindow}
                disabled={!tdsWindowState.tdsState.tdsColumns.length}
                title="Create Window Function Column"
              >
                <PlusIcon />
              </PanelHeaderActionItem>
            </PanelHeaderActions>
          </PanelHeader>
          <PanelContent>
            <PanelDropZone
              isDragOver={isDragOver}
              dropTargetConnector={dropTargetConnector}
            >
              {tdsWindowState.isEmpty && (
                <BlankPanelPlaceholder
                  text="Add Window Function Column"
                  tooltipText="Drag and drop columns here"
                />
              )}
              {!tdsWindowState.isEmpty && (
                <div
                  data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS}
                  className="query-builder__olap__columns"
                >
                  {tdsWindowState.windowColumns.map((col) => (
                    <QueryBuilderWindowColumnEditor
                      windowColumnState={col}
                      key={col.uuid}
                    />
                  ))}
                </div>
              )}
            </PanelDropZone>
          </PanelContent>
          {tdsWindowState.editColumn && (
            <QueryBuilderWindowColumnModalEditor
              windowState={tdsWindowState}
              windowColumnState={tdsWindowState.editColumn}
            />
          )}
        </div>
      </Panel>
    );
  },
);
