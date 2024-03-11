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

import { observer } from 'mobx-react-lite';
import {
  clsx,
  Dialog,
  CustomSelectorInput,
  CheckSquareIcon,
  SquareIcon,
  TimesIcon,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  SortIcon,
  DropdownMenu,
  MenuContent,
  MenuContentItem,
  ModalFooterButton,
  InputWithInlineValidation,
} from '@finos/legend-art';
import { SortColumnState } from '../../stores/fetch-structure/tds/QueryResultSetModifierState.js';
import {
  addUniqueEntry,
  deleteEntry,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { useApplicationStore } from '@finos/legend-application';
import type { QueryBuilderTDSState } from '../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import type { QueryBuilderTDSColumnState } from '../../stores/fetch-structure/tds/QueryBuilderTDSColumnState.js';
import { COLUMN_SORT_TYPE } from '../../graph/QueryBuilderMetaModelConst.js';
import { useEffect, useState } from 'react';
import type { QueryBuilderProjectionColumnState } from '../../stores/fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';

const ColumnSortEditor = observer(
  (props: {
    sortColumns: SortColumnState[];
    setSortColumns: (sortColumns: SortColumnState[]) => void;
    sortState: SortColumnState;
    tdsColumns: QueryBuilderTDSColumnState[];
  }) => {
    const { sortColumns, setSortColumns, sortState, tdsColumns } = props;
    const applicationStore = useApplicationStore();
    const projectionOptions = tdsColumns
      .filter(
        (projectionCol) =>
          projectionCol === sortState.columnState ||
          !sortColumns.some((sortCol) => sortCol.columnState === projectionCol),
      )
      .map((projectionCol) => ({
        label: projectionCol.columnName,
        value: projectionCol,
      }));
    const value = {
      label: sortState.columnState.columnName,
      value: sortState,
    };
    const sortType = sortState.sortType;

    const onChange = (
      val: { label: string; value: QueryBuilderTDSColumnState } | null,
    ): void => {
      if (val !== null) {
        sortState.setColumnState(val.value);
      }
    };

    const deleteColumnSort = (): void => {
      const newSortColumns = [...sortColumns];
      deleteEntry(newSortColumns, sortState);
      setSortColumns(newSortColumns);
    };

    const changeSortBy = (sortOp: COLUMN_SORT_TYPE) => (): void => {
      sortState.setSortType(sortOp);
    };

    return (
      <div className="panel__content__form__section__list__item query-builder__projection__options__sort">
        <CustomSelectorInput
          className="query-builder__projection__options__sort__dropdown"
          options={projectionOptions}
          disabled={
            projectionOptions.length < 1 ||
            (projectionOptions.length === 1 && Boolean(value))
          }
          onChange={onChange}
          value={value}
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        />
        <div className="query-builder__projection__options__sort__sortby">
          {sortType.toLowerCase()}
        </div>
        <DropdownMenu
          content={
            <MenuContent>
              {Object.values(COLUMN_SORT_TYPE).map((op) => (
                <MenuContentItem key={op} onClick={changeSortBy(op)}>
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
            className="query-builder__projection__options__sort__sortby--btn"
            tabIndex={-1}
            title="Choose SortBy Operator..."
          >
            <SortIcon />
          </div>
        </DropdownMenu>

        <button
          className="query-builder__projection__options__sort__remove-btn btn--dark btn--caution"
          onClick={deleteColumnSort}
          tabIndex={-1}
          title="Remove"
          data-testid={
            QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_MODIFIER_PANEL_SORT_REMOVE_BTN
          }
        >
          <TimesIcon />
        </button>
      </div>
    );
  },
);

const ColumnsSortEditor = observer(
  (props: {
    projectionColumns: QueryBuilderProjectionColumnState[];
    sortColumns: SortColumnState[];
    setSortColumns: (sortColumns: SortColumnState[]) => void;
    tdsColumns: QueryBuilderTDSColumnState[];
  }) => {
    const { projectionColumns, sortColumns, setSortColumns, tdsColumns } =
      props;
    const projectionOptions = projectionColumns
      .filter(
        (projectionCol) =>
          !sortColumns.some((sortCol) => sortCol.columnState === projectionCol),
      )
      .map((projectionCol) => ({
        label: projectionCol.columnName,
        value: projectionCol,
      }));
    const addValue = (): void => {
      if (projectionOptions.length > 0) {
        const sortColumn = new SortColumnState(
          guaranteeNonNullable(projectionOptions[0]).value,
        );
        const newSortColumns = [...sortColumns];
        addUniqueEntry(newSortColumns, sortColumn);
        setSortColumns(newSortColumns);
      }
    };

    return (
      <div className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          Sort and Order
        </div>
        <div className="panel__content__form__section__header__prompt">
          Choose the column(s) and order direction(s) that the results should be
          arranged by
        </div>
        <div className="panel__content__form__section__list">
          <div className="panel__content__form__section__list__items">
            {/* TODO: support DnD sorting */}
            {sortColumns.map((value) => (
              <ColumnSortEditor
                key={value.columnState.uuid}
                sortColumns={sortColumns}
                setSortColumns={setSortColumns}
                sortState={value}
                tdsColumns={tdsColumns}
              />
            ))}
          </div>
          <div className="panel__content__form__section__list__new-item__add">
            <button
              className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
              disabled={!projectionOptions.length}
              onClick={addValue}
              tabIndex={-1}
            >
              Add Value
            </button>
          </div>
        </div>
      </div>
    );
  },
);

const cloneSortColumnStateArray = (
  sortColumns: SortColumnState[],
): SortColumnState[] =>
  sortColumns.map((sortColumn) => {
    const newSortColumn = new SortColumnState(sortColumn.columnState);
    newSortColumn.setSortType(sortColumn.sortType);
    return newSortColumn;
  });

export const QueryResultModifierModal = observer(
  (props: { tdsState: QueryBuilderTDSState }) => {
    // Read current state
    const { tdsState } = props;
    const resultSetModifierState = tdsState.resultSetModifierState;
    const stateSortColumns = resultSetModifierState.sortColumns;
    const stateDistinct = resultSetModifierState.distinct;
    const stateLimitResults = resultSetModifierState.limit;
    const stateSlice = resultSetModifierState.slice;

    // Set up temp state for modal lifecycle
    const [sortColumns, setSortColumns] = useState(
      cloneSortColumnStateArray(stateSortColumns),
    );
    const [distinct, setDistinct] = useState(stateDistinct);
    const [limitResults, setLimitResults] = useState(stateLimitResults);
    const [slice, setSlice] = useState<
      [number | undefined, number | undefined]
    >(stateSlice ?? [undefined, undefined]);

    // Sync temp state with tdsState when modal is opened/closed
    useEffect(() => {
      setSortColumns(cloneSortColumnStateArray(stateSortColumns));
      setDistinct(stateDistinct);
      setLimitResults(stateLimitResults);
      setSlice(stateSlice ?? [undefined, undefined]);
    }, [
      resultSetModifierState.showModal,
      stateSortColumns,
      stateDistinct,
      stateLimitResults,
      stateSlice,
    ]);

    // Handle user actions
    const closeModal = (): void => resultSetModifierState.setShowModal(false);
    const applyChanges = (): void => {
      resultSetModifierState.setSortColumns(sortColumns);
      resultSetModifierState.setDistinct(distinct);
      resultSetModifierState.setLimit(limitResults);
      if (slice[0] !== undefined && slice[1] !== undefined) {
        resultSetModifierState.setSlice([slice[0], slice[1]]);
      } else {
        resultSetModifierState.setSlice(undefined);
      }
      resultSetModifierState.setShowModal(false);
    };

    const handleLimitResultsChange: React.ChangeEventHandler<
      HTMLInputElement
    > = (event) => {
      const val = event.target.value.replace(/[^0-9]/g, '');
      setLimitResults(val === '' ? undefined : parseInt(val, 10));
    };

    const handleSliceChange = (
      start: number | undefined,
      end: number | undefined,
    ): void => {
      const newSlice: [number | undefined, number | undefined] = [start, end];
      setSlice(newSlice);
    };

    const changeSliceStart: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      const val = event.target.value.replace(/[^0-9]/g, '');
      if (val === '') {
        handleSliceChange(undefined, slice[1]);
      } else {
        const start = typeof val === 'number' ? val : parseInt(val, 10);
        handleSliceChange(start, slice[1]);
      }
    };
    const changeSliceEnd: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      const val = event.target.value.replace(/[^0-9]/g, '');
      if (val === '') {
        handleSliceChange(slice[0], undefined);
      } else {
        const end = typeof val === 'number' ? val : parseInt(val, 10);
        handleSliceChange(slice[0], end);
      }
    };

    // Error states
    const isInvalidSlice =
      (slice[0] === undefined && slice[1] !== undefined) ||
      (slice[0] !== undefined && slice[1] === undefined) ||
      (slice[0] !== undefined &&
        slice[1] !== undefined &&
        slice[0] >= slice[1]);

    return (
      <Dialog
        open={Boolean(resultSetModifierState.showModal)}
        onClose={closeModal}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_MODIFIER_PANEL}
      >
        <Modal
          darkMode={true}
          className="editor-modal query-builder__projection__modal"
        >
          <ModalHeader title="Result Set Modifier" />
          <ModalBody className="query-builder__projection__modal__body">
            <div className="query-builder__projection__options">
              <ColumnsSortEditor
                projectionColumns={tdsState.projectionColumns}
                sortColumns={sortColumns}
                setSortColumns={setSortColumns}
                tdsColumns={tdsState.tdsColumns}
              />
              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label">
                  Eliminate Duplicate Rows
                </div>
                <div
                  className="panel__content__form__section__toggler"
                  onClick={() => setDistinct(!distinct)}
                >
                  <button
                    className={clsx(
                      'panel__content__form__section__toggler__btn',
                      {
                        'panel__content__form__section__toggler__btn--toggled':
                          distinct,
                      },
                    )}
                    tabIndex={-1}
                  >
                    {distinct ? <CheckSquareIcon /> : <SquareIcon />}
                  </button>
                  <div className="panel__content__form__section__toggler__prompt">
                    Remove duplicate rows from the results
                  </div>
                </div>
              </div>
              <div className="panel__content__form__section">
                <label
                  htmlFor="query-builder__projection__modal__limit-results-input"
                  className="panel__content__form__section__header__label"
                >
                  Limit Results
                </label>
                <div className="panel__content__form__section__header__prompt">
                  Specify the maximum total number of rows the output will
                  produce
                </div>
                <input
                  id="query-builder__projection__modal__limit-results-input"
                  className="panel__content__form__section__input panel__content__form__section__number-input"
                  spellCheck={false}
                  type="text"
                  value={limitResults ?? ''}
                  onChange={handleLimitResultsChange}
                />
              </div>
              <div className="panel__content__form__section">
                <label
                  htmlFor="query-builder__projection__modal__slice-start-input"
                  className="panel__content__form__section__header__label"
                >
                  Slice
                </label>
                <div className="panel__content__form__section__header__prompt">
                  Reduce the number of rows in the provided TDS, selecting the
                  set of rows in the specified range between start and stop
                </div>
                <div className="query-builder__result__slice">
                  <div className="query-builder__result__slice__input__wrapper">
                    <InputWithInlineValidation
                      id="query-builder__projection__modal__slice-start-input"
                      className="input--dark query-builder__result__slice__input"
                      spellCheck={false}
                      value={slice[0] ?? ''}
                      onChange={changeSliceStart}
                      type="text"
                      error={isInvalidSlice ? 'Invalid slice' : undefined}
                    />
                  </div>
                  <div className="query-builder__result__slice__range">..</div>
                  <div className="query-builder__result__slice__input__wrapper">
                    <InputWithInlineValidation
                      className="input--dark query-builder__result__slice__input"
                      spellCheck={false}
                      value={slice[1] ?? ''}
                      onChange={changeSliceEnd}
                      type="text"
                      error={isInvalidSlice ? 'Invalid slice' : undefined}
                    />
                  </div>
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              onClick={applyChanges}
              text="Apply"
              disabled={isInvalidSlice}
            />
            <ModalFooterButton
              onClick={closeModal}
              text="Cancel"
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
