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
import { DataCubeIcon, useDropdownMenu } from '@finos/legend-art';
import { DataCubeEditorColumnSelector } from './DataCubeEditorColumnSelector.js';
import type { DataCubeEditorColumnSelectorState } from '../../../stores/view/editor/DataCubeEditorColumnSelectorState.js';
import type { DataCubeEditorSortColumnState } from '../../../stores/view/editor/DataCubeEditorSortsPanelState.js';
import {
  DataCubeQuerySortDirection,
  PIVOT_COLUMN_NAME_VALUE_SEPARATOR,
} from '../../../stores/core/DataCubeQueryEngine.js';
import {
  FormDropdownMenu,
  FormDropdownMenuItem,
} from '../../core/DataCubeFormUtils.js';
import type { DataCubeViewState } from '../../../stores/view/DataCubeViewState.js';

const SortDirectionDropdown = observer(
  (props: {
    selector: DataCubeEditorColumnSelectorState<DataCubeEditorSortColumnState>;
    column: DataCubeEditorSortColumnState;
  }) => {
    const { column } = props;
    const [
      openDirectionDropdown,
      closeDirectionDropdown,
      directionDropdownProps,
      directionDropdownPropsOpen,
    ] = useDropdownMenu();

    return (
      <div className="group relative flex h-full items-center">
        {!directionDropdownPropsOpen && (
          <div className="flex h-[18px] w-32 items-center border border-transparent px-2 text-sm text-neutral-400 group-hover:invisible">
            {column.direction}
          </div>
        )}
        {directionDropdownPropsOpen && (
          <div className="flex h-[18px] w-32 items-center justify-between border border-sky-600 bg-sky-50 pl-2 pr-0.5 text-sm">
            <div>{column.direction}</div>
            <div>
              <DataCubeIcon.CaretDown />
            </div>
          </div>
        )}
        <button
          className="invisible absolute right-0 z-10 flex h-[18px] w-32 items-center justify-between border border-neutral-400 pl-2 pr-0.5 text-sm text-neutral-700 group-hover:visible"
          /**
           * ag-grid row select event listener is at a deeper layer than this dropdown trigger
           * so in order to prevent selecting the row while opening the dropdown, we need to stop
           * the propagation as event capturing is happening, not when it's bubbling.
           */
          onClickCapture={(event) => {
            event.stopPropagation();
            openDirectionDropdown(event);
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div>{column.direction}</div>
          <div>
            <DataCubeIcon.CaretDown />
          </div>
        </button>
        <FormDropdownMenu className="w-32" {...directionDropdownProps}>
          {[
            DataCubeQuerySortDirection.ASCENDING,
            DataCubeQuerySortDirection.DESCENDING,
          ].map((direction) => (
            <FormDropdownMenuItem
              key={direction}
              onClick={() => {
                column.setDirection(direction);
                closeDirectionDropdown();
              }}
              autoFocus={column.direction === direction}
            >
              {direction}
            </FormDropdownMenuItem>
          ))}
        </FormDropdownMenu>
      </div>
    );
  },
);

const SortColumnLabel = observer(
  (props: {
    selector: DataCubeEditorColumnSelectorState<DataCubeEditorSortColumnState>;
    column: DataCubeEditorSortColumnState;
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
    const darkMode = view.editor.generalProperties.configuration.darkMode;

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
          <DataCubeEditorColumnSelector
            selector={panel.selector}
            darkMode={darkMode}
            columnLabelRenderer={(p) => <SortColumnLabel {...p} />}
            columnActionRenderer={(p) => <SortDirectionDropdown {...p} />}
          />
        </div>
      </div>
    );
  },
);
