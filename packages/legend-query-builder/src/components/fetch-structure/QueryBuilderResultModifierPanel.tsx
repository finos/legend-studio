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
} from '@finos/legend-art';
import {
  COLUMN_SORT_TYPE,
  SortColumnState,
} from '../../stores/fetch-structure/tds/QueryResultSetModifierState.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { useApplicationStore } from '@finos/legend-application';
import type { QueryBuilderTDSState } from '../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import type { QueryBuilderTDSColumnState } from '../../stores/fetch-structure/tds/QueryBuilderTDSColumnState.js';

const ColumnSortEditor = observer(
  (props: { tdsState: QueryBuilderTDSState; sortState: SortColumnState }) => {
    const { tdsState, sortState } = props;
    const applicationStore = useApplicationStore();
    const sortColumns = tdsState.resultSetModifierState.sortColumns;
    const projectionOptions = tdsState.tdsColumns
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
    const onChange = (
      val: { label: string; value: QueryBuilderTDSColumnState } | null,
    ): void => {
      if (val !== null) {
        sortState.setColumnState(val.value);
      }
    };
    const sortType = sortState.sortType;

    const deleteColumnSort = (): void =>
      tdsState.resultSetModifierState.deleteSortColumn(sortState);
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
        >
          <TimesIcon />
        </button>
      </div>
    );
  },
);

const ColumnsSortEditor = observer(
  (props: { tdsState: QueryBuilderTDSState }) => {
    const { tdsState } = props;
    const resultSetModifierState = tdsState.resultSetModifierState;
    const sortColumns = resultSetModifierState.sortColumns;
    const projectionOptions = tdsState.projectionColumns
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
        resultSetModifierState.addSortColumn(sortColumn);
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
                tdsState={tdsState}
                sortState={value}
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
  (props: { tdsState: QueryBuilderTDSState }) => {
    const { tdsState: tdsState } = props;
    const resultSetModifierState = tdsState.resultSetModifierState;
    const limitResults = resultSetModifierState.limit;
    const distinct = resultSetModifierState.distinct;
    const close = (): void => resultSetModifierState.setShowModal(false);
    const toggleDistinct = (): void => resultSetModifierState.toggleDistinct();
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      const val = event.target.value;
      resultSetModifierState.setLimit(
        val === '' ? undefined : parseInt(val, 10),
      );
    };

    return (
      <Dialog
        open={Boolean(resultSetModifierState.showModal)}
        onClose={close}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <Modal darkMode={true} className="editor-modal">
          <ModalHeader title="Result Set Modifier" />
          <ModalBody className="query-builder__projection__modal__body">
            <div className="query-builder__projection__options">
              <ColumnsSortEditor tdsState={tdsState} />
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
                    {distinct ? <CheckSquareIcon /> : <SquareIcon />}
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
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton onClick={close} text="Close" />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
