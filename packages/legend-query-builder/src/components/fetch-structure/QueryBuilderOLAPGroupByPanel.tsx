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
  VerticalDragHandleIcon,
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
  PanelEntryDropZonePlaceholderContent,
} from '@finos/legend-art';
import { assertErrorThrown, guaranteeNonNullable } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { forwardRef, useCallback, useRef, useState } from 'react';
import { type DropTargetMonitor, useDrag, useDrop } from 'react-dnd';
import type { QueryBuilderTDS_OLAPOperator } from '../../stores/fetch-structure/tds/olapGroupBy/operators/QueryBuilderTDS_OLAPOperator.js';
import {
  type QueryBuilderOLAPGroupByState,
  type QueryBuilderOLAPDropTarget,
  type QueryBuilderOLAPColumnDragSource,
  QueryBuilderOLAPGroupByColumnState,
  QueryBuilderTDS_OLAPRankOperatorState,
  QueryBuilderTDS_OLAPAggreationOperatorState,
  QUERY_BUILDER_OLAP_COLUMN_DND_TYPE,
} from '../../stores/fetch-structure/tds/olapGroupBy/QueryBuilderOLAPGroupByState.js';
import { QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE } from '../../stores/fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import type { QueryBuilderTDSColumnState } from '../../stores/fetch-structure/tds/QueryBuilderTDSColumnState.js';
import type { QueryBuilderTDSState } from '../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import { COLUMN_SORT_TYPE } from '../../stores/fetch-structure/tds/QueryResultSetModifierState.js';
import { QUERY_BUILDER_TEST_ID } from '../QueryBuilder_TestID.js';

// helpers
const createOlapColumnState = (
  columnState: QueryBuilderTDSColumnState,
  tdsState: QueryBuilderTDSState,
): QueryBuilderOLAPGroupByColumnState => {
  const operator = tdsState.olapGroupByState.operators.filter(
    (o) =>
      o.isColumnAggregator() &&
      o.isCompatibleWithType(columnState.getColumnType()),
  )[0];
  const nonColoperator = guaranteeNonNullable(
    tdsState.olapGroupByState.operators.filter(
      (o) => !o.isColumnAggregator(),
    )[0],
  );
  if (operator) {
    const opState = new QueryBuilderTDS_OLAPAggreationOperatorState(
      tdsState.olapGroupByState,
      operator,
      columnState,
    );
    return new QueryBuilderOLAPGroupByColumnState(
      tdsState.olapGroupByState,
      [],
      undefined,
      opState,
      `${operator.getLabel()} ${columnState.columnName}`,
    );
  } else {
    return new QueryBuilderOLAPGroupByColumnState(
      tdsState.olapGroupByState,
      [columnState],
      undefined,
      new QueryBuilderTDS_OLAPRankOperatorState(
        tdsState.olapGroupByState,
        nonColoperator,
      ),
      `${nonColoperator.getLabel()} ${columnState.columnName}`,
    );
  }
};

const QueryBuilderOlapGroupByColumnContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      columnState: QueryBuilderOLAPGroupByColumnState;
    }
  >(function QueryBuilderOlapGroupByColumnContextMenu(props, ref) {
    const { columnState } = props;
    const editColumn = (): void =>
      columnState.olapState.setEditColumn(columnState);
    const removeColumn = (): void =>
      columnState.olapState.removeColumn(columnState);

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
          darkMode={!applicationStore.TEMPORARY__isLightThemeEnabled}
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

const QueryBuilderOlapColumnModalEditor = observer(
  (props: {
    olapGroupByState: QueryBuilderOLAPGroupByState;
    olapColumnState: QueryBuilderOLAPGroupByColumnState;
  }) => {
    const { olapGroupByState, olapColumnState } = props;
    const createNewOlap =
      !olapGroupByState.olapColumns.includes(olapColumnState);
    const tdsState = olapGroupByState.tdsState;
    const applicationStore = useApplicationStore();
    const close = (): void => {
      olapGroupByState.setEditColumn(undefined);
    };
    const isDuplicatedColumnName = createNewOlap
      ? olapGroupByState.tdsState.tdsColumns
          .map((c) => c.columnName)
          .includes(olapColumnState.columnName)
      : olapGroupByState.tdsState.isDuplicateColumn(olapColumnState);
    const windowOptions = createNewOlap
      ? tdsState.tdsColumns
      : olapColumnState.possibleReferencedColumns;
    const windowOptionsLabels = windowOptions.map((w) => ({
      label: w.columnName,
      value: w,
    }));
    // column Name
    const changeColumnName: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => olapColumnState.setColumnName(event.target.value);
    // operator
    const operators = olapGroupByState.operators;
    const operationState = olapColumnState.operationState;
    const olapOpColumn =
      operationState instanceof QueryBuilderTDS_OLAPAggreationOperatorState
        ? operationState.columnState
        : undefined;
    const changeOperatorCol = (
      val: { label: string; value: QueryBuilderTDSColumnState } | null,
    ): void => {
      if (
        operationState instanceof QueryBuilderTDS_OLAPAggreationOperatorState
      ) {
        if (val !== null) {
          operationState.setColumnState(val.value);
        }
      }
    };
    const changeOperator =
      (olapOp: QueryBuilderTDS_OLAPOperator) => (): void => {
        olapColumnState.changeOperator(olapOp);
      };
    // window
    const addOptions = windowOptions.filter(
      (e) => !olapColumnState.windowColumns.includes(e),
    );
    const create = (): void => {
      olapGroupByState.addOLAPColumn(olapColumnState);
      close();
    };
    const addWindowValue = (): void => {
      if (addOptions.length > 0) {
        olapColumnState.addWindow(guaranteeNonNullable(addOptions[0]));
      }
    };
    // sortby
    const sortByState = olapColumnState.sortByState;
    const changeSortBy = (sortOp: COLUMN_SORT_TYPE | undefined) => (): void => {
      olapColumnState.changeSortBy(sortOp);
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
        open={Boolean(olapGroupByState.editColumn)}
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
                applicationStore.TEMPORARY__isLightThemeEnabled,
            },
          ])}
        >
          <ModalHeader
            title={
              createNewOlap
                ? 'Create OLAP GroupBy Column'
                : 'Update OLAP GroupByColumn'
            }
          />
          <div className="query-builder__olap__modal__body">
            <PanelFormSection>
              <div className="panel__content__form__section__header__label">
                OLAP Operator
              </div>
              <div className="panel__content__form__section__header__prompt">
                OLAP aggregation function to apply and column if required by
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
                            !olapOpColumn,
                        },
                      )}
                    >
                      {operationState.operator.getLabel()}
                    </div>
                    {olapOpColumn && (
                      <div className="panel__content__form__section__list__item query-builder__olap__tds__column__options">
                        <CustomSelectorInput
                          className="query-builder__olap__tds__column__dropdown"
                          options={windowOptionsLabels}
                          disabled={windowOptionsLabels.length < 1}
                          onChange={changeOperatorCol}
                          value={{
                            value: olapOpColumn,
                            label: olapOpColumn.columnName,
                          }}
                          darkMode={
                            !applicationStore.TEMPORARY__isLightThemeEnabled
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
                      <button
                        className="query-builder__olap__column__operation__operator__badge"
                        tabIndex={-1}
                        title="Choose OLAP GroupBy Operator..."
                      >
                        <SigmaIcon />
                      </button>
                      <button
                        className="query-builder__olap__column__operation__operator__dropdown__trigger"
                        tabIndex={-1}
                        title="Choose OLAP GroupBy Operator..."
                      >
                        <CaretDownIcon />
                      </button>
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
                  {olapColumnState.windowColumns.map((value, idx) => (
                    <TDSColumnSelectorEditor
                      key={value.uuid}
                      colValue={value}
                      setColumn={(v: QueryBuilderTDSColumnState) =>
                        olapColumnState.changeWindow(v, idx)
                      }
                      deleteColumn={(v: QueryBuilderTDSColumnState): void =>
                        olapColumnState.deleteWindow(v)
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
                          !applicationStore.TEMPORARY__isLightThemeEnabled
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
                      title="Choose OLAP SortBy Operator..."
                    >
                      <SortIcon />
                    </div>
                    <div
                      className="query-builder__olap__column__sortby__operator__dropdown__trigger"
                      tabIndex={-1}
                      title="Choose OLAP SortBy Operator..."
                    >
                      <CaretDownIcon />
                    </div>
                  </DropdownMenu>
                </div>
              </div>
            </PanelFormSection>

            <PanelFormSection>
              <div className="panel__content__form__section__header__label">
                OLAP Column Name
              </div>
              <div className="panel__content__form__section__header__prompt">
                Name of OLAP Column that will be part of TDS Result
              </div>
              <InputWithInlineValidation
                className="query-builder__olap__column__name__input input-group__input"
                spellCheck={false}
                value={olapColumnState.columnName}
                onChange={changeColumnName}
                validationErrorMessage={
                  isDuplicatedColumnName ? 'Duplicated column' : undefined
                }
              />
            </PanelFormSection>
          </div>
          <ModalFooter>
            {createNewOlap ? (
              <button className="btn modal__footer__close-btn" onClick={create}>
                Create
              </button>
            ) : (
              <button className="btn modal__footer__close-btn" onClick={close}>
                Close
              </button>
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
      (item: QueryBuilderOLAPColumnDragSource): void => {
        handleChange(item.columnState);
      },
      [handleChange],
    );
    const [{ isDragOver }, dropOpConnector] = useDrop<
      QueryBuilderOLAPColumnDragSource,
      void,
      { isDragOver: boolean }
    >(
      () => ({
        accept: [
          QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE,
          QUERY_BUILDER_OLAP_COLUMN_DND_TYPE,
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
              showPlaceholder={isDragOver}
              placeholderContent={
                <PanelEntryDropZonePlaceholderContent label="Change Column" />
              }
              className="query-builder__dnd__placeholder"
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
                  darkMode={!applicationStore.TEMPORARY__isLightThemeEnabled}
                />
              </div>
            </div>
          </BasePopover>
        )}
      </>
    );
  },
);

const QueryBuilderOlapGroupByColumnEditor = observer(
  (props: { olapColumnState: QueryBuilderOLAPGroupByColumnState }) => {
    const { olapColumnState } = props;
    const olapState = olapColumnState.olapState;
    const tdsState = olapState.tdsState;
    const operators = olapState.operators;
    // state
    const ref = useRef<HTMLDivElement>(null);
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
    ) => olapColumnState.setColumnName(event.target.value);
    const isDuplicatedColumnName = tdsState.isDuplicateColumn(olapColumnState);

    // window columns
    const windowOptions = olapColumnState.possibleReferencedColumns;
    const addWindowOptions = windowOptions.filter(
      (e) => !olapColumnState.windowColumns.includes(e),
    );
    const addWindowValue = (): void => {
      if (addWindowOptions.length > 0) {
        olapColumnState.addWindow(guaranteeNonNullable(addWindowOptions[0]));
      }
    };

    // operator
    const operationState = olapColumnState.operationState;
    const aggregateColumn =
      operationState instanceof QueryBuilderTDS_OLAPAggreationOperatorState
        ? operationState.columnState
        : undefined;

    const changeOperator =
      (olapOp: QueryBuilderTDS_OLAPOperator) => (): void => {
        olapColumnState.changeOperator(olapOp);
      };

    // sortby
    const sortByState = olapColumnState.sortByState;
    const changeSortBy = (sortOp: COLUMN_SORT_TYPE | undefined) => (): void => {
      olapColumnState.changeSortBy(sortOp);
    };

    // action
    const isRemovalDisabled = olapState.tdsState.isColumnInUse(olapColumnState);
    const removeColumn = (): void => {
      olapColumnState.olapState.removeColumn(olapColumnState);
    };
    const editoColumn = (): void => {
      olapState.setEditColumn(olapColumnState);
    };

    // Drag and Drop
    const handleHover = useCallback(
      (
        item: QueryBuilderOLAPColumnDragSource,
        monitor: DropTargetMonitor,
      ): void => {
        const dragIndex = tdsState.olapGroupByState.olapColumns.findIndex(
          (e) => e === item.columnState,
        );
        const hoverIndex = tdsState.olapGroupByState.olapColumns.findIndex(
          (e) => e === olapColumnState,
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
        olapState.moveColumn(dragIndex, hoverIndex);
      },
      [olapColumnState, olapState, tdsState.olapGroupByState.olapColumns],
    );
    const [, dropConnector] = useDrop<QueryBuilderOLAPColumnDragSource>(
      () => ({
        accept: [QUERY_BUILDER_OLAP_COLUMN_DND_TYPE],
        hover: (item, monitor): void => handleHover(item, monitor),
      }),
      [handleHover],
    );
    const [{ olapColumnBeingDragged }, dragConnector, dragPreviewConnector] =
      useDrag<
        QueryBuilderOLAPColumnDragSource,
        void,
        {
          olapColumnBeingDragged: QueryBuilderTDSColumnState | undefined;
        }
      >(
        () => ({
          type: QUERY_BUILDER_OLAP_COLUMN_DND_TYPE,
          item: () => ({
            columnState: olapColumnState,
          }),
          collect: (monitor) => ({
            /**
             * @workaround typings - https://github.com/react-dnd/react-dnd/pull/3484
             */
            olapColumnBeingDragged:
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
              (monitor.getItem() as QueryBuilderOLAPColumnDragSource | null)
                ?.columnState,
          }),
        }),
        [olapColumnState],
      );
    const isBeingDragged = olapColumnState === olapColumnBeingDragged;
    dragConnector(dropConnector(ref));
    useDragPreviewLayer(dragPreviewConnector);

    const handleOpDrop = (val: QueryBuilderTDSColumnState): void => {
      if (
        operationState instanceof QueryBuilderTDS_OLAPAggreationOperatorState
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
      (item: QueryBuilderOLAPColumnDragSource): void => {
        const colState = item.columnState;
        if (
          olapColumnState.possibleReferencedColumns.includes(colState) &&
          !olapColumnState.windowColumns.includes(colState)
        ) {
          olapColumnState.addWindow(colState);
        }
      },
      [olapColumnState],
    );
    const [{ isDragOver }, dropOpConnector] = useDrop<
      QueryBuilderOLAPColumnDragSource,
      void,
      { isDragOver: boolean }
    >(
      () => ({
        accept: [
          QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE,
          QUERY_BUILDER_OLAP_COLUMN_DND_TYPE,
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
      <div ref={ref} className="query-builder__olap__column">
        <PanelEntryDropZonePlaceholder
          showPlaceholder={isBeingDragged}
          className="query-builder__dnd__placeholder"
        >
          <ContextMenu
            content={
              <QueryBuilderOlapGroupByColumnContextMenu
                columnState={olapColumnState}
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
            <div className="query-builder__olap__column__drag-handle__container">
              <div className="query-builder__olap__column__drag-handle">
                <VerticalDragHandleIcon />
              </div>
            </div>
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
                      options: olapColumnState.possibleReferencedColumns,
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
                  <button
                    className="query-builder__olap__column__operation__operator__badge"
                    tabIndex={-1}
                    title="Choose OLAP GroupBy Operator..."
                  >
                    <SigmaIcon />
                  </button>
                  <button
                    className="query-builder__olap__column__operation__operator__dropdown__trigger"
                    tabIndex={-1}
                    title="Choose OLAP GroupBy Operator..."
                  >
                    <CaretDownIcon />
                  </button>
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
                  showPlaceholder={isDragOver}
                  placeholderContent={
                    <PanelEntryDropZonePlaceholderContent label="Add" />
                  }
                  className="query-builder__dnd__placeholder"
                >
                  <div
                    title={`${olapColumnState.windowColumns.length} columns partitioned`}
                    className="query-builder__olap__column__window__content__label"
                  >
                    ({olapColumnState.windowColumns.length})
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
                      {olapColumnState.windowColumns.map((value, idx) => (
                        <TDSColumnSelectorEditor
                          key={value.uuid}
                          colValue={value}
                          setColumn={(v: QueryBuilderTDSColumnState) =>
                            olapColumnState.changeWindow(v, idx)
                          }
                          deleteColumn={(v: QueryBuilderTDSColumnState): void =>
                            olapColumnState.deleteWindow(v)
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
                      options: olapColumnState.possibleReferencedColumns,
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
                  <button
                    className={clsx(
                      'query-builder__olap__column__sortby__operator__badge',
                      {
                        'query-builder__olap__column__sortby__operator__badge--activated':
                          Boolean(sortByState),
                      },
                    )}
                    tabIndex={-1}
                    title="Choose OLAP SortBy Operator..."
                  >
                    <SortIcon />
                  </button>
                  <button
                    className="query-builder__olap__column__sortby__operator__dropdown__trigger"
                    tabIndex={-1}
                    title="Choose OLAP SortBy Operator..."
                  >
                    <CaretDownIcon />
                  </button>
                </DropdownMenu>
              </div>
            </div>
            <div className="query-builder__olap__column__name">
              <InputWithInlineValidation
                className="query-builder__olap__column__name__input input-group__input"
                spellCheck={false}
                value={olapColumnState.columnName}
                onChange={changeColumnName}
                validationErrorMessage={
                  isDuplicatedColumnName ? 'Duplicated column' : undefined
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
        </PanelEntryDropZonePlaceholder>
      </div>
    );
  },
);

export const QueryBuilderOlapGroupByPanel = observer(
  (props: { olapGroupByState: QueryBuilderOLAPGroupByState }) => {
    const { olapGroupByState } = props;
    const applicationStore = useApplicationStore();
    const createOlapGroupBy = (): void => {
      const col = olapGroupByState.tdsState.tdsColumns[0];
      if (col) {
        const newOlapState = createOlapColumnState(
          col,
          olapGroupByState.tdsState,
        );
        olapGroupByState.setEditColumn(newOlapState);
      }
    };
    // Drag and Drop
    const handleDrop = useCallback(
      async (item: QueryBuilderOLAPDropTarget): Promise<void> => {
        try {
          const newOlapState = createOlapColumnState(
            item.columnState,
            olapGroupByState.tdsState,
          );
          olapGroupByState.addOLAPColumn(newOlapState);
        } catch (error) {
          assertErrorThrown(error);
          applicationStore.notifyError(error.message);
          return;
        }
      },
      [applicationStore, olapGroupByState],
    );
    const [{ isDragOver }, dropTargetConnector] = useDrop<
      QueryBuilderOLAPDropTarget,
      void,
      { isDragOver: boolean }
    >(
      () => ({
        accept: [
          QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE,
          QUERY_BUILDER_OLAP_COLUMN_DND_TYPE,
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
      <div
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_OLAP_GROUPBY}
        className="panel"
      >
        <div
          data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_OLAP_GROUPBY}
          className="panel"
        >
          <div className="panel__header">
            <div className="panel__header__title">
              <div className="panel__header__title__label">OLAP</div>
            </div>
            <div className="panel__header__actions">
              <button
                className="panel__header__action"
                onClick={createOlapGroupBy}
                disabled={!olapGroupByState.tdsState.tdsColumns.length}
                tabIndex={-1}
                title="Create OLAP GroupBy Column"
              >
                <PlusIcon />
              </button>
            </div>
          </div>
          <PanelContent>
            <PanelDropZone
              isDragOver={isDragOver}
              dropTargetConnector={dropTargetConnector}
            >
              {olapGroupByState.isEmpty && (
                <BlankPanelPlaceholder
                  text="Add OLAP GroupBy Column"
                  tooltipText="Drag and drop columns here"
                />
              )}
              {!olapGroupByState.isEmpty && (
                <div
                  data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TDS}
                  className="query-builder__olap__columns"
                >
                  {olapGroupByState.olapColumns.map((col) => (
                    <QueryBuilderOlapGroupByColumnEditor
                      olapColumnState={col}
                      key={col.uuid}
                    />
                  ))}
                </div>
              )}
            </PanelDropZone>
          </PanelContent>
          {olapGroupByState.editColumn && (
            <QueryBuilderOlapColumnModalEditor
              olapGroupByState={olapGroupByState}
              olapColumnState={olapGroupByState.editColumn}
            />
          )}
        </div>
      </div>
    );
  },
);
