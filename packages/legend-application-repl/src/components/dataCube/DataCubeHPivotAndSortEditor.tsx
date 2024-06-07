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

import { CustomSelectorInput } from '@finos/legend-art';
import type { REPLGridClientStore } from '../../stores/REPLGridClientStore.js';
import { TDS_SORT_ORDER } from '../grid/TDSRequest.js';
import { GenericPropertiesEditor } from '../dataCube/GenericPropertiesEditor.js';

type SortOption = {
  label: string;
  value: TDS_SORT_ORDER;
};

const AvailableSortColumnsDisplay = observer(
  (props: { editorStore: REPLGridClientStore }) => {
    const { editorStore } = props;
    const hPivotAndSortColumnState =
      editorStore.dataCubeState.propertiesPanelState.hpivotAndSortPanelState;
    const sortOptions = Array.from(Object.values(TDS_SORT_ORDER)).map(
      (val) => ({
        label: val,
        value: val,
      }),
    );
    const onAvailableColumnsSortOptionsChanged = (
      columnName: string,
    ): ((option: SortOption) => void) =>
      function AvailableColumnSortOption(option: SortOption): void {
        const column = hPivotAndSortColumnState.availableSortColumns.find(
          (col) => col.column === columnName,
        );
        if (column) {
          column.setOrder(option.value);
        }
      };
    return (
      <>
        {hPivotAndSortColumnState.availableSortColumnsSearchResults.map(
          (col) => (
            <div
              className="repl__column__editor__available__columns__children"
              key={col.column}
            >
              <div
                className="repl__column__editor__available__columns__children__name"
                onDoubleClick={(): void =>
                  hPivotAndSortColumnState.addAvailableSortColumn(col.column)
                }
              >
                {col.column}
              </div>
              <CustomSelectorInput
                className="repl__column__editor__available__columns__children__order"
                options={sortOptions}
                onChange={onAvailableColumnsSortOptionsChanged(col.column)}
                value={{ label: col.order, value: col.order }}
                isClearable={false}
                darkMode={false}
              />
            </div>
          ),
        )}
      </>
    );
  },
);

const SelectedSortColumnsDisplay = observer(
  (props: { editorStore: REPLGridClientStore }) => {
    const { editorStore } = props;
    const hPivotAndSortColumnState =
      editorStore.dataCubeState.propertiesPanelState.hpivotAndSortPanelState;
    const sortOptions = Array.from(Object.values(TDS_SORT_ORDER)).map(
      (val) => ({
        label: val,
        value: val,
      }),
    );
    const onSelectedColumnsSortOptionsChanged = (
      columnName: string,
    ): ((option: SortOption) => void) =>
      function SelectedColumnSortOption(option: SortOption): void {
        const column = hPivotAndSortColumnState.selectedSortColumns.find(
          (col) => col.column === columnName,
        );
        if (column) {
          column.setOrder(option.value);
        }
      };
    return (
      <>
        {hPivotAndSortColumnState.selectedSortColumnsSearchResults.map(
          (col) => (
            <div
              className="repl__column__editor__available__columns__children"
              key={col.column}
            >
              <div
                className="repl__column__editor__available__columns__children__name"
                onDoubleClick={(): void =>
                  hPivotAndSortColumnState.addSelectedSortColumn(col.column)
                }
              >
                {col.column}
              </div>
              <CustomSelectorInput
                className="repl__column__editor__available__columns__children__order"
                options={sortOptions}
                onChange={onSelectedColumnsSortOptionsChanged(col.column)}
                value={{ label: col.order, value: col.order }}
                isClearable={false}
                darkMode={false}
              />
            </div>
          ),
        )}
      </>
    );
  },
);

export const HPivotAndSortEditor = observer(
  (props: { editorStore: REPLGridClientStore }) => {
    const { editorStore } = props;
    const hPivotAndSortColumnState =
      editorStore.dataCubeState.propertiesPanelState.hpivotAndSortPanelState;
    return (
      <GenericPropertiesEditor
        label="sort"
        availableColumnsSearchText={
          hPivotAndSortColumnState.availableSortColumnsSearchText
        }
        selectedColumnsSearchText={
          hPivotAndSortColumnState.selectedSortColumnsSearchText
        }
        setAvailableColumnsSearchText={
          hPivotAndSortColumnState.setAvailableSortColumnsSearchText
        }
        setSelectedColumnsSearchText={
          hPivotAndSortColumnState.setSelectedSortColumnsSearchText
        }
        addAllAvailableColumns={
          hPivotAndSortColumnState.addAllSelectedSortColumns
        }
        addAllSelectedColumns={
          hPivotAndSortColumnState.addAllSelectedSortColumns
        }
        availableColumnDisplay={
          <AvailableSortColumnsDisplay editorStore={editorStore} />
        }
        selectedColumnDisplay={
          <SelectedSortColumnsDisplay editorStore={editorStore} />
        }
      />
    );
  },
);
