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
} from '@finos/legend-art';
import { prettyCONSTName } from '@finos/legend-shared';

export const GenericPropertiesEditor = observer(
  (props: {
    label: string;
    availableColumnsSearchText: string;
    selectedColumnsSearchText: string;
    setAvailableColumnsSearchText: (val: string) => void;
    setSelectedColumnsSearchText: (val: string) => void;
    addAllAvailableColumns: () => void;
    addAllSelectedColumns: () => void;
    availableColumnDisplay: React.ReactElement;
    selectedColumnDisplay: React.ReactElement;
  }) => {
    const {
      label,
      availableColumnsSearchText,
      selectedColumnsSearchText,
      setAvailableColumnsSearchText,
      setSelectedColumnsSearchText,
      addAllAvailableColumns,
      addAllSelectedColumns,
      availableColumnDisplay,
      selectedColumnDisplay,
    } = props;
    const onAvailableColumnsSearchTextChange: React.ChangeEventHandler<
      HTMLInputElement
    > = (event) => {
      setAvailableColumnsSearchText(event.target.value);
    };
    const onSelectedColumnsSearchTextChange: React.ChangeEventHandler<
      HTMLInputElement
    > = (event) => {
      setSelectedColumnsSearchText(event.target.value);
    };
    const clearAvailableColumnsSearchText = (): void => {
      setAvailableColumnsSearchText('');
    };
    const clearSelectedColumnsSearchText = (): void => {
      setSelectedColumnsSearchText('');
    };

    return (
      <div className="repl__hpivot__sort__editor">
        <div className="repl__column__editor">
          <div className="repl__column__editor__header">
            {`${prettyCONSTName(label)}s`}
          </div>
          <div className="repl__column__editor__content">
            <div className="repl__column__editor__available__columns">
              <div className="repl__column__editor__description">
                {`Available ${label} columns:`}
              </div>
              <div className="repl__column__editor__container">
                <div className="repl-properties-search-panel__header">
                  <div className="repl-properties-search-panel__input__container">
                    <input
                      className={clsx('repl-properties-search-panel__input', {
                        'repl-properties-search-panel__input--searching':
                          availableColumnsSearchText,
                      })}
                      spellCheck={false}
                      onChange={onAvailableColumnsSearchTextChange}
                      value={availableColumnsSearchText}
                      placeholder="Search"
                    />
                    {!availableColumnsSearchText ? (
                      <>
                        <div className="repl-properties-search-panel__input__search__icon">
                          <SearchIcon />
                        </div>
                      </>
                    ) : (
                      <button
                        className="repl-properties-search-panel__input__clear-btn"
                        tabIndex={-1}
                        onClick={clearAvailableColumnsSearchText}
                        title="Clear"
                      >
                        <TimesIcon />
                      </button>
                    )}
                  </div>
                </div>
                <div className="repl__column__editor__available__columns__content">
                  <div
                    className="repl__column__editor__available__columns__root"
                    onDoubleClick={(): void => addAllAvailableColumns()}
                  >
                    <PlusIcon />
                    <div className="repl__column__editor__available__columns__root__label">
                      All
                    </div>
                  </div>
                  {availableColumnDisplay}
                </div>
              </div>
            </div>
            <div className="repl__column__editor__actions">
              <div className="repl__column__editor__action">
                <button
                  tabIndex={-1}
                  // onClick={clearSearch}
                  title="Add"
                >
                  Add
                  <ChevronRightIcon />
                </button>
              </div>
              <div className="repl__column__editor__action">
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
            <div className="repl__column__editor__selected__columns">
              <div className="repl__column__editor__description">
                {`Selected ${label} columns:`}
              </div>
              <div className="repl__column__editor__container">
                <div className="repl-properties-search-panel__header">
                  <div className="repl-properties-search-panel__input__container">
                    <input
                      className={clsx('repl-properties-search-panel__input', {
                        'repl-properties-search-panel__input--searching':
                          selectedColumnsSearchText,
                      })}
                      spellCheck={false}
                      onChange={onSelectedColumnsSearchTextChange}
                      value={selectedColumnsSearchText}
                      placeholder="Search"
                    />
                    {!selectedColumnsSearchText ? (
                      <>
                        <div className="repl-properties-search-panel__input__search__icon">
                          <SearchIcon />
                        </div>
                      </>
                    ) : (
                      <button
                        className="repl-properties-search-panel__input__clear-btn"
                        tabIndex={-1}
                        onClick={clearSelectedColumnsSearchText}
                        title="Clear"
                      >
                        <TimesIcon />
                      </button>
                    )}
                  </div>
                </div>
                <div className="repl__column__editor__available__columns__content">
                  <div
                    className="repl__column__editor__available__columns__root"
                    onDoubleClick={(): void => addAllSelectedColumns()}
                  >
                    <PlusIcon />
                    <div className="repl__column__editor__available__columns__root__label">
                      All
                    </div>
                  </div>
                  {selectedColumnDisplay}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
