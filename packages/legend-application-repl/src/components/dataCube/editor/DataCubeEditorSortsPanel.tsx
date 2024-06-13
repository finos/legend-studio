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
import { DATA_CUBE_COLUMN_SORT_DIRECTION } from '../../../stores/dataCube/DataCubeMetaModelConst.js';
import { useREPLStore } from '../../REPLStoreProvider.js';

export const DataCubeEditorSortsPanel = observer(() => {
  const replStore = useREPLStore();
  const panel = replStore.dataCubeState.editor.sortsPanel;
  const onAvailabeColumnsSearchTextChange: React.ChangeEventHandler<
    HTMLInputElement
  > = (event) => {
    panel.setAvailableColumnsSearchText(event.target.value);
  };
  const onSelectedColumnsSearchTextChange: React.ChangeEventHandler<
    HTMLInputElement
  > = (event) => {
    panel.setSelectedColumnsSearchText(event.target.value);
  };
  const clearAvailableColumnsSearchText = (): void => {
    panel.setAvailableColumnsSearchText('');
  };
  const clearSelectedColumnsSearchText = (): void => {
    panel.setSelectedColumnsSearchText('');
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
      const column = panel.availableColumns.find(
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
      const column = panel.selectedColumns.find(
        (col) => col.column.name === columnName,
      );
      if (column) {
        column.setDirection(option.value);
      }
    };

  return (
    <div className="repl__hpivot__sort__editor">
      <div className="repl__hpivot__sort__column__editor">
        <div className="repl__hpivot__sort__column__editor__header">Sorts</div>
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
                          panel.availableColumnsSearchText,
                      },
                    )}
                    spellCheck={false}
                    onChange={onAvailabeColumnsSearchTextChange}
                    value={panel.availableColumnsSearchText}
                    placeholder="Search"
                  />
                  {!panel.availableColumnsSearchText ? (
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
                  onDoubleClick={(): void => panel.addAllAvailableColumns()}
                >
                  <PlusIcon />
                  <div className="repl__hpivot__sort__column__editor__available__columns__root__label">
                    All
                  </div>
                </div>
                {panel.availableColumnsSearchResults.map((col) => (
                  <div
                    className="repl__hpivot__sort__column__editor__available__columns__children"
                    key={col.column.name}
                  >
                    <div className="repl__hpivot__sort__column__editor__available__columns__children__line" />
                    <div
                      className="repl__hpivot__sort__column__editor__available__columns__children__name"
                      onDoubleClick={(): void =>
                        panel.addAvailableColumn(col.column.name)
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
                          panel.selectedColumnsSearchText,
                      },
                    )}
                    spellCheck={false}
                    onChange={onSelectedColumnsSearchTextChange}
                    value={panel.selectedColumnsSearchText}
                    placeholder="Search"
                  />
                  {!panel.selectedColumnsSearchText ? (
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
                  onDoubleClick={(): void => panel.addAllSelectedColumns()}
                >
                  <PlusIcon />
                  <div className="repl__hpivot__sort__column__editor__available__columns__root__label">
                    All
                  </div>
                </div>
                {panel.selectedColumnsSearchResults.map((col) => (
                  <div
                    className="repl__hpivot__sort__column__editor__available__columns__children"
                    key={col.column.name}
                  >
                    <div
                      className="repl__hpivot__sort__column__editor__available__columns__children__name"
                      onDoubleClick={(): void =>
                        panel.addSelectedColumn(col.column.name)
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
});
