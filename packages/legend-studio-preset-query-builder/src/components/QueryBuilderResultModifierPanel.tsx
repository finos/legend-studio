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
  FaCheckSquare,
  FaSortAlphaDown,
  FaSortAlphaDownAlt,
  FaSquare,
  FaTimes,
} from 'react-icons/fa';
import { clsx, CustomSelectorInput } from '@finos/legend-studio-components';
import { Dialog } from '@material-ui/core';
import {
  COLUMN_SORT_TYPE,
  SortColumnState,
} from '../stores/QueryResultSetModifierState';
import type { QueryBuilderState } from '../stores/QueryBuilderState';
import { useEditorStore } from '@finos/legend-studio';
import type { QueryBuilderProjectionColumnState } from '../stores/QueryBuilderProjectionState';

const ColumnSortEditor = observer(
  (props: {
    queryBuilderState: QueryBuilderState;
    columnSort: SortColumnState;
  }) => {
    const { queryBuilderState, columnSort } = props;
    const projectionState =
      queryBuilderState.fetchStructureState.projectionState;
    const sortColumns = queryBuilderState.resultSetModifierState.sortColumns;
    const projectionOptions = projectionState.columns
      .filter(
        (projectionCol) =>
          projectionCol === columnSort.columnState ||
          !sortColumns.some((sortCol) => sortCol.columnState === projectionCol),
      )
      .map((projectionCol) => ({
        label: projectionCol.columnName,
        value: projectionCol,
      }));
    const value = {
      label: columnSort.columnState.columnName,
      value: columnSort,
    };
    const onChange = (
      val: { label: string; value: QueryBuilderProjectionColumnState } | null,
    ): void => {
      if (val !== null) {
        columnSort.setColumnState(val.value);
      }
    };
    const sortType = columnSort.sortType;
    const toggleSortType = (): void => {
      columnSort.setSortType(
        sortType === COLUMN_SORT_TYPE.ASC
          ? COLUMN_SORT_TYPE.DESC
          : COLUMN_SORT_TYPE.ASC,
      );
    };
    const deleteColumnSort = (): void =>
      queryBuilderState.resultSetModifierState.deleteSortColumn(columnSort);
    return (
      <div className="panel__content__form__section__list__item query-builder__projection__options__sort">
        <CustomSelectorInput
          className="query-builder__projection__options__sort__dropdown"
          options={projectionOptions}
          disabled={projectionOptions.length <= 1}
          onChange={onChange}
          value={value}
          darkMode={true}
        />
        <button
          className="btn--dark btn--sm query-builder__projection__options__sort__type-btn"
          tabIndex={-1}
          onClick={toggleSortType}
        >
          {sortType === COLUMN_SORT_TYPE.ASC ? (
            <FaSortAlphaDown />
          ) : (
            <FaSortAlphaDownAlt />
          )}
        </button>
        <button
          className="query-builder__projection__options__sort__remove-btn"
          onClick={deleteColumnSort}
          tabIndex={-1}
          title={'Remove'}
        >
          <FaTimes />
        </button>
      </div>
    );
  },
);

const ColumnsSortEditor = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const editorStore = useEditorStore();
    const resultModifier = queryBuilderState.resultSetModifierState;
    const sortColumns = resultModifier.sortColumns;
    const projectionState =
      queryBuilderState.fetchStructureState.projectionState;
    const projectionOptions = projectionState.columns
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
          editorStore,
          projectionOptions[0].value,
        );
        resultModifier.addSortColumn(sortColumn);
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
                queryBuilderState={queryBuilderState}
                columnSort={value}
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

export const QueryResultModifierModal = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const resultModifier = queryBuilderState.resultSetModifierState;
    const limitResults = resultModifier.limit;
    const distinct = resultModifier.distinct;
    const close = (): void => resultModifier.setShowModal(false);
    const toggleDistinct = (): void => resultModifier.toggleDistinct();
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      const val = event.target.value;
      resultModifier.setLimit(val === '' ? undefined : parseInt(val, 10));
    };
    return (
      <Dialog
        open={Boolean(resultModifier.showModal)}
        onClose={close}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <div className="modal modal--dark editor-modal">
          <div className="modal__header">
            <div className="modal__title">Result Set Modifier</div>
          </div>
          <div className="modal__body query-builder__projection__modal__body">
            <div className="query-builder__projection__options">
              <ColumnsSortEditor queryBuilderState={queryBuilderState} />
              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label">
                  Eliminate Duplicate Rows
                </div>
                <div
                  className="panel__content__form__section__toggler"
                  onClick={toggleDistinct}
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
                    {distinct ? <FaCheckSquare /> : <FaSquare />}
                  </button>
                  <div className="panel__content__form__section__toggler__prompt">
                    Remove duplicate rows from the results
                  </div>
                </div>
              </div>
              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label">
                  Limit Results
                </div>
                <div className="panel__content__form__section__header__prompt">
                  Specify the maximum total number of rows the output will
                  produce
                </div>
                <input
                  className="panel__content__form__section__input panel__content__form__section__number-input"
                  spellCheck={false}
                  type="number"
                  value={limitResults ?? ''}
                  onChange={changeValue}
                />
              </div>
            </div>
          </div>
          <div className="modal__footer">
            <button className="btn modal__footer__close-btn" onClick={close}>
              Close
            </button>
          </div>
        </div>
      </Dialog>
    );
  },
);
