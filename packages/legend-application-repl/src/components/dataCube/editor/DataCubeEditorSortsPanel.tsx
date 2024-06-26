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
import { DataCubeIcon, DropdownMenu } from '@finos/legend-art';
import { useREPLStore } from '../../REPLStoreProvider.js';
import { DataCubeEditorColumnsSelector } from './DataCubeEditorColumnsSelector.js';
import type { DataCubeEditorColumnsSelectorState } from '../../../stores/dataCube/editor/DataCubeEditorColumnsSelectorState.js';
import type { DataCubeEditorSortColumnState } from '../../../stores/dataCube/editor/DataCubeEditorSortsPanelState.js';
import { DataCubeQuerySnapshotSortOperation } from '../../../stores/dataCube/core/DataCubeQuerySnapshot.js';
import { IllegalStateError } from '@finos/legend-shared';

function getSortDirectionLabel(operation: DataCubeQuerySnapshotSortOperation) {
  switch (operation) {
    case DataCubeQuerySnapshotSortOperation.ASCENDING:
      return 'Ascending';
    case DataCubeQuerySnapshotSortOperation.DESCENDING:
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

    return (
      <div className="group relative flex h-full items-center">
        <div className="flex h-[18px] w-20 items-center border border-transparent px-1 text-sm text-neutral-500 group-hover:invisible">
          {getSortDirectionLabel(column.operation)}
        </div>
        <DropdownMenu
          className="invisible absolute right-0 z-10 flex h-[18px] w-20 items-center justify-between border border-neutral-500 pl-1 pr-0.5 text-sm text-neutral-700 group-hover:visible"
          content={
            <div className="w-20 border-neutral-500 bg-white">
              <div
                className="flex h-5 cursor-pointer items-center px-2 text-sm hover:bg-neutral-100"
                onClick={() =>
                  column.setOperation(
                    DataCubeQuerySnapshotSortOperation.ASCENDING,
                  )
                }
              >
                Ascending
              </div>
              <div
                className="flex h-5 cursor-pointer items-center px-2 text-sm hover:bg-neutral-100"
                onClick={() =>
                  column.setOperation(
                    DataCubeQuerySnapshotSortOperation.DESCENDING,
                  )
                }
              >
                Descending
              </div>
            </div>
          }
          menuProps={{
            anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
            transformOrigin: { vertical: 'top', horizontal: 'right' },
            elevation: 2,
            hideBackdrop: true,
            transitionDuration: 0,
          }}
          useCapture={true}
        >
          <div>{getSortDirectionLabel(column.operation)}</div>
          <div>
            <DataCubeIcon.CaretDown />
          </div>
        </DropdownMenu>
      </div>
    );
  },
);

export const DataCubeEditorSortsPanel = observer(() => {
  const replStore = useREPLStore();
  const panel = replStore.dataCubeState.editor.sortsPanel;

  return (
    <div className="data-cube-column-selector h-full w-full p-2">
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
          selector={panel.columnsSelector}
          extraColumnComponent={(props) => <SortDirectionDropdown {...props} />}
        />
      </div>
    </div>
  );
});
