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
  ControlledDropdownMenu,
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
  DragPreviewLayer,
} from '@finos/legend-art';
import {
  assertErrorThrown,
  clone,
  deleteEntry,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { forwardRef, useCallback, useRef, useState } from 'react';
import {
  type DropTargetMonitor,
  useDrag,
  useDragLayer,
  useDrop,
} from 'react-dnd';
import type { QueryBuilderTDS_WindowOperator } from '../../stores/fetch-structure/tds/window/operators/QueryBuilderTDS_WindowOperator.js';
import {
  type QueryBuilderWindowState,
  type QueryBuilderWindowDropTarget,
  type QueryBuilderWindowColumnDragSource,
  QueryBuilderWindowColumnState,
  QueryBuilderTDS_WindowRankOperatorState,
  QueryBuilderTDS_WindowAggreationOperatorState,
  QUERY_BUILDER_WINDOW_COLUMN_DND_TYPE,
  WindowGroupByColumnSortByState,
} from '../../stores/fetch-structure/tds/window/QueryBuilderWindowState.js';
import { QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE } from '../../stores/fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import type { QueryBuilderTDSColumnState } from '../../stores/fetch-structure/tds/QueryBuilderTDSColumnState.js';
import type { QueryBuilderTDSState } from '../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import { QueryBuilderPanelIssueCountBadge } from '../shared/QueryBuilderPanelIssueCountBadge.js';
import { COLUMN_SORT_TYPE } from '../../graph/QueryBuilderMetaModelConst.js';
import { CAN_DROP_MAIN_GROUP_DND_TYPES } from './QueryBuilderPostFilterPanel.js';

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
  const columnName = operator
    ? operator.isColumnAggregator()
      ? `${operator.getLabel()} of ${columnState.columnName}`
      : columnState.columnName
    : nonColoperator.isColumnAggregator()
      ? `${nonColoperator.getLabel()} of ${columnState.columnName}`
      : columnState.columnName;
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
      columnName,
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
      columnName,
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
    // Read state
    const { windowState, windowColumnState } = props;
    const isNewWindowFunction =
      !windowState.windowColumns.includes(windowColumnState);
    const tdsState = windowState.tdsState;
    const applicationStore = useApplicationStore();

    // Column name
    const [selectedColumnName, setSelectedColumnName] = useState(
      windowColumnState.columnName,
    );
    const changeColumnName: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => setSelectedColumnName(event.target.value);
    const isDuplicatedColumnName = isNewWindowFunction
      ? windowState.tdsState.tdsColumns
          .map((c) => c.columnName)
          .filter((name) => name === selectedColumnName).length > 0
      : windowState.tdsState.tdsColumns
          .map((c) => c.columnName)
          .filter((name) => name === selectedColumnName).length > 0 &&
        selectedColumnName !== windowColumnState.columnName;

    // Window operator
    const operators = windowState.operators;
    const operatorState = windowColumnState.operatorState;
    const [selectedOperatorState, setSelectedOperatorState] = useState(() => {
      if (
        operatorState instanceof QueryBuilderTDS_WindowAggreationOperatorState
      ) {
        return new QueryBuilderTDS_WindowAggreationOperatorState(
          operatorState.windowState,
          operatorState.operator,
          operatorState.columnState,
        );
      }
      return new QueryBuilderTDS_WindowRankOperatorState(
        operatorState.windowState,
        operatorState.operator,
      );
    });
    const windowOperatorColumn =
      selectedOperatorState instanceof
      QueryBuilderTDS_WindowAggreationOperatorState
        ? selectedOperatorState.columnState
        : undefined;
    const changeWindowOperatorColumn = (
      val: { label: string; value: QueryBuilderTDSColumnState } | null,
    ): void => {
      if (
        selectedOperatorState instanceof
          QueryBuilderTDS_WindowAggreationOperatorState &&
        val !== null
      ) {
        const newOpertorState = clone(selectedOperatorState);
        const newColumnName = newOpertorState.operator.isColumnAggregator()
          ? `${newOpertorState.operator.getLabel()} of ${val.value.columnName}`
          : val.value.columnName;
        newOpertorState.setColumnState(val.value);
        setSelectedOperatorState(newOpertorState);
        setSelectedColumnName(newColumnName);
      }
    };
    const changeOperator =
      (newOperator: QueryBuilderTDS_WindowOperator) => (): void => {
        const stateAndName =
          windowColumnState.getChangeOperatorStateAndColumnName(
            selectedOperatorState.operator,
            windowOperatorColumn,
            newOperator,
          );
        if (stateAndName) {
          setSelectedOperatorState(stateAndName.operatorState);
          setSelectedColumnName(stateAndName.columnName);
        }
      };
    const allColumns = isNewWindowFunction
      ? tdsState.tdsColumns
      : windowColumnState.possibleReferencedColumns;
    const allColumnsOptions = allColumns.map((w) => ({
      label: w.columnName,
      value: w,
    }));

    // Window columns
    const [selectedWindowColumns, setSelectedWindowColumns] = useState([
      ...windowColumnState.windowColumns,
    ]);
    const availableColumns = allColumns.filter(
      (e) => !selectedWindowColumns.includes(e),
    );
    const addWindowColumn = (): void => {
      if (availableColumns.length > 0) {
        setSelectedWindowColumns([
          ...selectedWindowColumns,
          guaranteeNonNullable(availableColumns[0]),
        ]);
      }
    };
    const updateWindowColumn = (
      idx: number,
      column: QueryBuilderTDSColumnState,
    ): void => {
      const newWindowColumns = clone(selectedWindowColumns);
      newWindowColumns[idx] = column;
      setSelectedWindowColumns(newWindowColumns);
    };
    const deleteWindowColumn = (column: QueryBuilderTDSColumnState): void => {
      const newWindowColumns = clone(selectedWindowColumns);
      deleteEntry(newWindowColumns, column);
      setSelectedWindowColumns(newWindowColumns);
    };

    // Sort by
    const [selectedSortBy, setSelectedSortBy] = useState(() => {
      const sortBy = windowColumnState.sortByState;
      if (sortBy) {
        return new WindowGroupByColumnSortByState(
          sortBy.columnState,
          sortBy.sortType,
        );
      }
      return undefined;
    });
    const changeSortBy = (sortOp: COLUMN_SORT_TYPE | undefined) => (): void => {
      if (selectedSortBy?.sortType !== sortOp) {
        if (sortOp) {
          const newSortByState = new WindowGroupByColumnSortByState(
            selectedSortBy?.columnState
              ? selectedSortBy.columnState
              : guaranteeNonNullable(
                  windowColumnState.possibleReferencedColumns[0],
                ),
            sortOp,
          );
          setSelectedSortBy(newSortByState);
        } else {
          setSelectedSortBy(undefined);
        }
      }
    };
    const changeSortCol = (
      val: { label: string; value: QueryBuilderTDSColumnState } | null,
    ): void => {
      if (selectedSortBy && val !== null) {
        const newSortByState = new WindowGroupByColumnSortByState(
          val.value,
          selectedSortBy.sortType,
        );
        setSelectedSortBy(newSortByState);
      }
    };

    // Modal lifecycle actions
    const handleCancel = (): void => {
      windowState.setEditColumn(undefined);
    };

    const handleApply = (): void => {
      windowColumnState.setColumnName(selectedColumnName);
      windowColumnState.setOperatorState(selectedOperatorState);
      windowColumnState.setWindows(selectedWindowColumns);
      windowColumnState.setSortBy(selectedSortBy);
      windowState.addWindowColumn(windowColumnState);
      handleCancel();
    };

    return (
      <Dialog
        open={Boolean(windowState.editColumn)}
        onClose={handleCancel}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
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
              isNewWindowFunction
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
                    {windowOperatorColumn && (
                      <div className="panel__content__form__section__list__item query-builder__olap__tds__column__options">
                        <CustomSelectorInput
                          className="query-builder__olap__tds__column__dropdown"
                          options={allColumnsOptions}
                          disabled={allColumnsOptions.length < 1}
                          onChange={changeWindowOperatorColumn}
                          value={{
                            value: windowOperatorColumn,
                            label: windowOperatorColumn.columnName,
                          }}
                          darkMode={
                            !applicationStore.layoutService
                              .TEMPORARY__isLightColorThemeEnabled
                          }
                        />
                      </div>
                    )}
                    <div
                      className={clsx(
                        'query-builder__olap__column__operation__operator__label',
                        {
                          'query-builder__olap__column__operation__operator__label__agg':
                            !windowOperatorColumn,
                        },
                      )}
                    >
                      {selectedOperatorState.operator.getLabel()}
                    </div>
                    <ControlledDropdownMenu
                      className="query-builder__olap__column__operation__operator__dropdown"
                      title="Choose Window Function Operator..."
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
                      <div className="query-builder__olap__column__operation__operator__badge">
                        <SigmaIcon />
                      </div>
                      <div className="query-builder__olap__column__operation__operator__dropdown__trigger">
                        <CaretDownIcon />
                      </div>
                    </ControlledDropdownMenu>
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
                for which to apply the aggregate function
              </div>
              <div className="panel__content__form__section__list">
                <div className="panel__content__form__section__list__items">
                  {selectedWindowColumns.map((value, idx) => (
                    <TDSColumnSelectorEditor
                      key={value.uuid}
                      colValue={value}
                      setColumn={(v: QueryBuilderTDSColumnState) =>
                        updateWindowColumn(idx, v)
                      }
                      deleteColumn={(v: QueryBuilderTDSColumnState) =>
                        deleteWindowColumn(v)
                      }
                      tdsColOptions={availableColumns}
                    />
                  ))}
                </div>
                <div className="panel__content__form__section__list__new-item__add">
                  <button
                    className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                    disabled={!availableColumns.length}
                    onClick={addWindowColumn}
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
                  {selectedSortBy && (
                    <div className="panel__content__form__section__list__item query-builder__olap__tds__column__options">
                      <CustomSelectorInput
                        className="query-builder__olap__tds__column__dropdown"
                        options={allColumnsOptions}
                        disabled={allColumnsOptions.length < 1}
                        onChange={changeSortCol}
                        value={{
                          value: selectedSortBy.columnState,
                          label: selectedSortBy.columnState.columnName,
                        }}
                        darkMode={
                          !applicationStore.layoutService
                            .TEMPORARY__isLightColorThemeEnabled
                        }
                      />
                    </div>
                  )}
                  {!selectedSortBy && (
                    <div className="query-builder__olap__column__sortby__none">
                      (none)
                    </div>
                  )}
                  {selectedSortBy && (
                    <div className="query-builder__olap__column__sortby__operator__label">
                      {selectedSortBy.sortType.toLowerCase()}
                    </div>
                  )}
                  <ControlledDropdownMenu
                    className="query-builder__olap__column__sortby__operator__dropdown"
                    title="Choose Window Function SortBy Operator..."
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
                            Boolean(selectedSortBy),
                        },
                      )}
                      tabIndex={-1}
                    >
                      <SortIcon />
                    </div>
                    <div
                      className="query-builder__olap__column__sortby__operator__dropdown__trigger"
                      tabIndex={-1}
                    >
                      <CaretDownIcon />
                    </div>
                  </ControlledDropdownMenu>
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
                value={selectedColumnName}
                onChange={changeColumnName}
                error={isDuplicatedColumnName ? 'Duplicated column' : undefined}
              />
            </PanelFormSection>
          </div>
          <ModalFooter>
            <ModalFooterButton
              text={isNewWindowFunction ? 'Create' : 'Apply'}
              onClick={handleApply}
              disabled={isDuplicatedColumnName}
            />
            <ModalFooterButton
              text="Cancel"
              onClick={handleCancel}
              type="secondary"
            />
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
    const [{ isDragOver }, dropConnector] = useDrop<
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
    const ref = useRef<HTMLDivElement>(null);
    dropConnector(ref);

    return (
      <>
        <button
          onClick={openOpAnchor}
          className="query-builder__olap__tds__column"
        >
          <div ref={ref} className="query-builder__olap__tds__column-badge">
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
    const operationState = windowColumnState.operatorState;
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
    const [{ isDragOver }, operationDropConnector] = useDrop<
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
    const opRef = useRef<HTMLButtonElement>(null);
    operationDropConnector(opRef);

    return (
      <PanelDnDEntry
        ref={ref}
        className="query-builder__olap__column"
        showPlaceholder={isBeingDragged}
        placeholder={
          <div className="query-builder__olap__column__placeholder" />
        }
        placeholderContainerClassName="query-builder__olap__column__placeholder__container"
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
              {aggregateColumn && (
                <TDSColumnReferenceEditor
                  tdsColumn={aggregateColumn}
                  handleChange={handleOpDrop}
                  selectionEditor={{
                    options: windowColumnState.possibleReferencedColumns,
                  }}
                />
              )}
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
              <ControlledDropdownMenu
                className="query-builder__olap__column__operation__operator__dropdown"
                disabled={!operators.length}
                title="Choose Window Function Operator..."
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
                <div className="query-builder__olap__column__operation__operator__badge">
                  <SigmaIcon />
                </div>
                <div className="query-builder__olap__column__operation__operator__dropdown__trigger">
                  <CaretDownIcon />
                </div>
              </ControlledDropdownMenu>
            </div>
          </div>
          <div className="query-builder__olap__column__window">
            <button
              ref={opRef}
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
                        tdsColOptions={addWindowOptions}
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
              {sortByState && (
                <div className="query-builder__olap__column__sortby__operator__label">
                  {sortByState.sortType.toLowerCase()}
                </div>
              )}
              <ControlledDropdownMenu
                className="query-builder__olap__column__sortby__operator__dropdown"
                title="Choose Window Function SortBy Operator..."
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
                >
                  <SortIcon />
                </div>
                <div className="query-builder__olap__column__sortby__operator__dropdown__trigger">
                  <CaretDownIcon />
                </div>
              </ControlledDropdownMenu>
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

    const [{ isDragOver }, dropConnector] = useDrop<
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

    const { isDroppable } = useDragLayer((monitor) => ({
      isDroppable:
        monitor.isDragging() &&
        CAN_DROP_MAIN_GROUP_DND_TYPES.includes(
          monitor.getItemType()?.toString() ?? '',
        ),
    }));

    const ref = useRef<HTMLDivElement>(null);
    dropConnector(ref);

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
              isDragOver={isDragOver && tdsWindowState.isEmpty}
              isDroppable={isDroppable && tdsWindowState.isEmpty}
              dropTargetConnector={dropConnector}
            >
              {tdsWindowState.isEmpty && (
                <BlankPanelPlaceholder
                  text="Add Window Function Column"
                  tooltipText="Drag and drop columns here"
                />
              )}
              {!tdsWindowState.isEmpty && (
                <>
                  <DragPreviewLayer
                    labelGetter={(
                      item: QueryBuilderWindowColumnDragSource,
                    ): string =>
                      item.columnState.columnName === ''
                        ? '(unknown)'
                        : item.columnState.columnName
                    }
                    types={[QUERY_BUILDER_WINDOW_COLUMN_DND_TYPE]}
                  />
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
                </>
              )}
              {isDroppable && !tdsWindowState.isEmpty && (
                <div
                  ref={ref}
                  className="query-builder__olap__free-drop-zone__container"
                >
                  <PanelEntryDropZonePlaceholder
                    isDragOver={isDragOver}
                    isDroppable={isDroppable}
                    className="query-builder__olap__free-drop-zone"
                    label="Add new window function column"
                  >
                    <></>
                  </PanelEntryDropZonePlaceholder>
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
