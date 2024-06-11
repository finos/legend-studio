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
  PlusIcon,
  SearchIcon,
  TimesIcon,
  clsx,
  ChevronLeftIcon,
  ChevronRightIcon,
  CustomSelectorInput,
} from '@finos/legend-art';
import type { REPLStore } from '../../../stores/dataCube/DataCubeStore.js';
import { DATA_CUBE_COLUMN_SORT_DIRECTION } from '../../../stores/dataCube/DataCubeMetaModelConst.js';

export const DataCubeEditorSortPanel = observer(
  (props: { editorStore: REPLStore }) => {
    const { editorStore } = props;
    const sortState = editorStore.dataCubeState.editor.sort;
    const onAvailabeColumnsSearchTextChange: React.ChangeEventHandler<
      HTMLInputElement
    > = (event) => {
      sortState.setAvailableColumnsSearchText(event.target.value);
    };
    const onSelectedColumnsSearchTextChange: React.ChangeEventHandler<
      HTMLInputElement
    > = (event) => {
      sortState.setSelectedColumnsSearchText(event.target.value);
    };
    const clearAvailableColumnsSearchText = (): void => {
      sortState.setAvailableColumnsSearchText('');
    };
    const clearSelectedColumnsSearchText = (): void => {
      sortState.setSelectedColumnsSearchText('');
    };
    const sortOptions = Array.from(
      Object.values(DATA_CUBE_COLUMN_SORT_DIRECTION),
    ).map((val) => ({
      label: val,
      value: val,
    }));
    const onAvailableColumnsSortOptionsChanged =
      (columnName: string) =>
      (option: {
        label: string;
        value: DATA_CUBE_COLUMN_SORT_DIRECTION;
      }): void => {
        const column = sortState.availableColumns.find(
          (col) => col.column.name === columnName,
        );
        if (column) {
          column.setDirection(option.value);
        }
      };

    const onSelectedColumnsSortOptionsChanged =
      (columnName: string) =>
      (option: {
        label: string;
        value: DATA_CUBE_COLUMN_SORT_DIRECTION;
      }): void => {
        const column = sortState.selectedColumns.find(
          (col) => col.column.name === columnName,
        );
        if (column) {
          column.setDirection(option.value);
        }
      };

    return (
      <div className="repl__hpivot__sort__editor">
        <div className="repl__hpivot__sort__column__editor">
          <div className="repl__hpivot__sort__column__editor__header">
            Sorts
          </div>
          <div className="repl__hpivot__sort__column__editor__content">
            <div className="repl__hpivot__sort__column__editor__available__columns">
              <div className="repl__hpivot__sort__column__editor__description">
                Available sort columns:
              </div>
              <div className="repl__hpivot__sort__column__editor__container">
                <div className="query-builder-property-search-panel__header">
                  <div className="query-builder-property-search-panel__input__container">
                    <input
                      className={clsx(
                        'query-builder-property-search-panel__input',
                        {
                          'query-builder-property-search-panel__input--searching':
                            sortState.availableColumnsSearchText,
                        },
                      )}
                      spellCheck={false}
                      onChange={onAvailabeColumnsSearchTextChange}
                      value={sortState.availableColumnsSearchText}
                      placeholder="Search"
                    />
                    {!sortState.availableColumnsSearchText ? (
                      <>
                        <div className="query-builder-property-search-panel__input__search__icon">
                          <SearchIcon />
                        </div>
                      </>
                    ) : (
                      <button
                        className="query-builder-property-search-panel__input__clear-btn"
                        tabIndex={-1}
                        onClick={clearAvailableColumnsSearchText}
                        title="Clear"
                      >
                        <TimesIcon />
                      </button>
                    )}
                  </div>
                </div>
                <div className="repl__hpivot__sort__column__editor__available__columns__content">
                  <div
                    className="repl__hpivot__sort__column__editor__available__columns__root"
                    onDoubleClick={(): void =>
                      sortState.addAllAvailableColumns()
                    }
                  >
                    <PlusIcon />
                    <div className="repl__hpivot__sort__column__editor__available__columns__root__label">
                      All
                    </div>
                  </div>
                  {sortState.availableColumnsSearchResults.map((col) => (
                    <div
                      className="repl__hpivot__sort__column__editor__available__columns__children"
                      key={col.column.name}
                    >
                      <div
                        className="repl__hpivot__sort__column__editor__available__columns__children__name"
                        onDoubleClick={(): void =>
                          sortState.addAvailableColumn(col.column.name)
                        }
                      >
                        {col.column.name}
                      </div>
                      <CustomSelectorInput
                        className="repl__hpivot__sort__column__editor__available__columns__children__order"
                        options={sortOptions}
                        onChange={onAvailableColumnsSortOptionsChanged(
                          col.column.name,
                        )}
                        value={{ label: col.direction, value: col.direction }}
                        isClearable={false}
                        darkMode={false}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="repl__hpivot__sort__column__editor__actions">
              <div className="repl__hpivot__sort__column__editor__action">
                <button
                  tabIndex={-1}
                  // onClick={clearSearch}
                  title="Add"
                >
                  Add
                  <ChevronRightIcon />
                </button>
              </div>
              <div className="repl__hpivot__sort__column__editor__action">
                <button
                  tabIndex={-1}
                  // onClick={clearSearch}
                  title="Remove"
                >
                  <ChevronLeftIcon />
                  Remove
                </button>
              </div>
            </div>
            <div className="repl__hpivot__sort__column__editor__selected__columns">
              <div className="repl__hpivot__sort__column__editor__description">
                Selected sort columns:
              </div>
              <div className="repl__hpivot__sort__column__editor__container">
                <div className="query-builder-property-search-panel__header">
                  <div className="query-builder-property-search-panel__input__container">
                    <input
                      className={clsx(
                        'query-builder-property-search-panel__input',
                        {
                          'query-builder-property-search-panel__input--searching':
                            sortState.selectedColumnsSearchText,
                        },
                      )}
                      spellCheck={false}
                      onChange={onSelectedColumnsSearchTextChange}
                      value={sortState.selectedColumnsSearchText}
                      placeholder="Search"
                    />
                    {!sortState.selectedColumnsSearchText ? (
                      <>
                        <div className="query-builder-property-search-panel__input__search__icon">
                          <SearchIcon />
                        </div>
                      </>
                    ) : (
                      <button
                        className="query-builder-property-search-panel__input__clear-btn"
                        tabIndex={-1}
                        onClick={clearSelectedColumnsSearchText}
                        title="Clear"
                      >
                        <TimesIcon />
                      </button>
                    )}
                  </div>
                </div>
                <div className="repl__hpivot__sort__column__editor__available__columns__content">
                  <div
                    className="repl__hpivot__sort__column__editor__available__columns__root"
                    onDoubleClick={(): void =>
                      sortState.addAllSelectedColumns()
                    }
                  >
                    <PlusIcon />
                    <div className="repl__hpivot__sort__column__editor__available__columns__root__label">
                      All
                    </div>
                  </div>
                  {sortState.selectedColumnsSearchResults.map((col) => (
                    <div
                      className="repl__hpivot__sort__column__editor__available__columns__children"
                      key={col.column.name}
                    >
                      <div
                        className="repl__hpivot__sort__column__editor__available__columns__children__name"
                        onDoubleClick={(): void =>
                          sortState.addSelectedColumn(col.column.name)
                        }
                      >
                        {col.column.name}
                      </div>
                      <CustomSelectorInput
                        className="repl__hpivot__sort__column__editor__available__columns__children__order"
                        options={sortOptions}
                        onChange={onSelectedColumnsSortOptionsChanged(
                          col.column.name,
                        )}
                        value={{ label: col.direction, value: col.direction }}
                        isClearable={false}
                        darkMode={false}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
