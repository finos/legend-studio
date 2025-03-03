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
import { DataCubeIcon } from '@finos/legend-art';
import {
  DataCubeEditorColumnsSelectorSortDirectionDropdown,
  DataCubeEditorColumnsSelector,
} from './DataCubeEditorColumnsSelector.js';
import type {
  DataCubeEditorColumnsSelectorState,
  DataCubeEditorColumnsSelectorSortColumnState,
} from '../../../stores/view/editor/DataCubeEditorColumnsSelectorState.js';
import { PIVOT_COLUMN_NAME_VALUE_SEPARATOR } from '../../../stores/core/DataCubeQueryEngine.js';
import type { DataCubeViewState } from '../../../stores/view/DataCubeViewState.js';

const SortColumnLabel = observer(
  (props: {
    selector: DataCubeEditorColumnsSelectorState<DataCubeEditorColumnsSelectorSortColumnState>;
    column: DataCubeEditorColumnsSelectorSortColumnState;
  }) => {
    const { column } = props;

    return (
      <div className="h-full flex-1 items-center overflow-hidden overflow-ellipsis whitespace-nowrap pl-2">
        {column.name.split(PIVOT_COLUMN_NAME_VALUE_SEPARATOR).join(' / ')}
      </div>
    );
  },
);

export const DataCubeEditorSortsPanel = observer(
  (props: { view: DataCubeViewState }) => {
    const { view } = props;
    const panel = view.editor.sorts;

    return (
      <div className="h-full w-full select-none p-2">
        <div className="flex h-6">
          <div className="flex h-6 items-center text-xl font-medium">
            <DataCubeIcon.TableSort />
          </div>
          <div className="ml-1 flex h-6 items-center text-xl font-medium">
            Sorts
          </div>
        </div>
        <div className="flex h-[calc(100%_-_24px)] w-full">
          <DataCubeEditorColumnsSelector
            selector={panel.selector}
            columnLabelRenderer={(p) => <SortColumnLabel {...p} />}
            columnActionRenderer={(p) => (
              <DataCubeEditorColumnsSelectorSortDirectionDropdown {...p} />
            )}
          />
        </div>
      </div>
    );
  },
);
