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
  DataCubeIcon,
  useDropdownMenu,
  DropdownMenuItem,
  DropdownMenu,
} from '@finos/legend-art';
import { useREPLStore } from '../../REPLStoreProvider.js';
import { DataCubeEditorColumnsSelector } from './DataCubeEditorColumnsSelector.js';
import type { DataCubeEditorColumnsSelectorState } from '../../../stores/dataCube/editor/DataCubeEditorColumnsSelectorState.js';
import type { DataCubeEditorSortColumnState } from '../../../stores/dataCube/editor/DataCubeEditorSortsPanelState.js';
import { DataCubeQuerySortOperation } from '../../../stores/dataCube/core/DataCubeQueryEngine.js';
import { IllegalStateError } from '@finos/legend-shared';
import { FormBadge_WIP } from '../../repl/Form.js';

function getSortDirectionLabel(operation: DataCubeQuerySortOperation) {
  switch (operation) {
    case DataCubeQuerySortOperation.ASCENDING:
      return 'Ascending';
    case DataCubeQuerySortOperation.DESCENDING:
      return 'Descending';
    default:
      throw new IllegalStateError(`Unsupported sort operation '${operation}'`);
  }
}

const SortDirectionDropdown = observer(
  (props: {
    selector: DataCubeEditorColumnsSelectorState<DataCubeEditorSortColumnState>;
    column: DataCubeEditorSortColumnState;
  }) => {
    const { column } = props;
    const [openMenu, closeMenu, menuProps] = useDropdownMenu();

    return (
      <div className="group relative flex h-full items-center">
        <div className="flex h-[18px] w-32 items-center border border-transparent px-2 text-sm text-neutral-400 group-hover:invisible">
          {getSortDirectionLabel(column.operation)}
        </div>
        <button
          className="invisible absolute right-0 z-10 flex h-[18px] w-32 items-center justify-between border border-neutral-400 pl-2 pr-0.5 text-sm text-neutral-700 group-hover:visible"
          /**
           * ag-grid row select event listener is at a deeper layer than this dropdown trigger
           * so in order to prevent selecting the row while opening the dropdown, we need to stop
           * the propagation as event capturing is happening, not when it's bubbling.
           */
          onClickCapture={(event) => {
            event.stopPropagation();
            openMenu(event);
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div>{getSortDirectionLabel(column.operation)}</div>
          <div>
            <DataCubeIcon.CaretDown />
          </div>
        </button>
        <DropdownMenu
          menuProps={{
            classes: {
              paper: 'rounded-none mt-[1px]',
              list: 'w-32 p-0 rounded-none border border-neutral-400 bg-white max-h-40 overflow-y-auto py-0.5',
            },
          }}
          {...menuProps}
        >
          <DropdownMenuItem
            className="flex h-5 items-center px-2 text-sm hover:bg-neutral-100"
            onClick={() => {
              column.setOperation(DataCubeQuerySortOperation.ASCENDING);
              closeMenu();
            }}
          >
            Ascending
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex h-5 items-center px-2 text-sm text-neutral-400"
            disabled={true}
          >
            {`Ascending (abs)`}
            <FormBadge_WIP />
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex h-5 items-center px-2 text-sm hover:bg-neutral-100"
            onClick={() => {
              column.setOperation(DataCubeQuerySortOperation.DESCENDING);
              closeMenu();
            }}
          >
            Descending
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex h-5 items-center px-2 text-sm text-neutral-400"
            disabled={true}
          >
            {`Descending (abs)`}
            <FormBadge_WIP />
          </DropdownMenuItem>
        </DropdownMenu>
      </div>
    );
  },
);

export const DataCubeEditorSortsPanel = observer(() => {
  const repl = useREPLStore();
  const panel = repl.dataCube.editor.sorts;

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
          extraColumnComponent={(props) => <SortDirectionDropdown {...props} />}
        />
      </div>
    </div>
  );
});
