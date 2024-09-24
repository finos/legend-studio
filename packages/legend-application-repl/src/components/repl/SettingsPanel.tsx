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
import { FormCheckbox, FormNumberInput } from './Form.js';
import {
  DEFAULT_ENABLE_DEBUG_MODE,
  DEFAULT_ENABLE_ENGINE_DEBUG_MODE,
  DEFAULT_GRID_CLIENT_PURGE_CLOSED_ROW_NODES,
  DEFAULT_GRID_CLIENT_ROW_BUFFER,
  DEFAULT_GRID_CLIENT_SUPPRESS_LARGE_DATASET_WARNING,
} from '../../stores/dataCube/DataCubeEngine.js';
import { useState } from 'react';
import { useDataCubeStore } from '../DataCubeStoreProvider.js';

export const SettingsPanel = observer(() => {
  const dataCubeStore = useDataCubeStore();
  const dataCubeEngine = dataCubeStore.engine;

  // NOTE: this makes sure the changes are not applied until saved, but it generates
  // a lot of boilerplate code, consider using a more ergonomic approach when we need
  // to scale this to more settings.
  const [enableDebugMode, setEnableDebugMode] = useState(
    dataCubeEngine.enableDebugMode,
  );
  const [enableEngineDebugMode, setEnableEngineDebugMode] = useState(
    dataCubeEngine.enableEngineDebugMode,
  );
  const [gridClientRowBuffer, setGridClientRowBuffer] = useState(
    dataCubeEngine.gridClientRowBuffer,
  );
  const [gridClientPurgeClosedRowNodes, setGridClientPurgeClosedRowNodes] =
    useState(dataCubeEngine.gridClientPurgeClosedRowNodes);
  const [
    gridClientSuppressLargeDatasetWarning,
    setGridClientSuppressLargeDatasetWarning,
  ] = useState(dataCubeEngine.gridClientSuppressLargeDatasetWarning);

  const save = () => {
    dataCubeEngine.setEnableDebugMode(enableDebugMode);
    dataCubeEngine.setEnableEngineDebugMode(enableEngineDebugMode);
    dataCubeEngine.setGridClientRowBuffer(gridClientRowBuffer);
    dataCubeEngine.setGridClientPurgeClosedRowNodes(
      gridClientPurgeClosedRowNodes,
    );
    dataCubeEngine.setGridClientSuppressLargeDatasetWarning(
      gridClientSuppressLargeDatasetWarning,
    );
  };
  const restoreDefaults = () => {
    setGridClientRowBuffer(DEFAULT_GRID_CLIENT_ROW_BUFFER);
    setGridClientPurgeClosedRowNodes(
      DEFAULT_GRID_CLIENT_PURGE_CLOSED_ROW_NODES,
    );
    setEnableDebugMode(DEFAULT_ENABLE_DEBUG_MODE);
    setEnableEngineDebugMode(DEFAULT_ENABLE_ENGINE_DEBUG_MODE);
    setGridClientSuppressLargeDatasetWarning(
      DEFAULT_GRID_CLIENT_SUPPRESS_LARGE_DATASET_WARNING,
    );
    save();
  };

  return (
    <>
      <div className="h-[calc(100%_-_40px)] w-full p-2 pb-0">
        <div className="h-full w-full select-none overflow-auto border border-neutral-300 bg-white p-2">
          <div className="flex h-6">
            <div className="flex h-full">
              <div className="flex h-6 items-center text-xl font-medium">
                <DataCubeIcon.Table />
              </div>
              <div className="ml-1 flex h-6 items-center text-xl font-medium">
                Grid
              </div>
            </div>
          </div>
          <div className="mt-1.5">
            <div className="font-medium">Large Dataset Warning: Disabled</div>
            <div className="flex pr-2">
              <FormCheckbox
                label="Suggests user to enable pagination when handling large datasets to improve performance."
                checked={gridClientSuppressLargeDatasetWarning}
                onChange={() =>
                  setGridClientSuppressLargeDatasetWarning(
                    !gridClientSuppressLargeDatasetWarning,
                  )
                }
              />
            </div>
          </div>
          <div className="my-2">
            <div className="font-medium">Refresh Failed Data Fetch: Action</div>
            <div className="mb-1.5 text-sm text-neutral-700">
              {`Manually re-run all failed data fetches in the grid.`}
            </div>
            <div className="flex pr-2">
              <button
                className="ml-2 h-5 min-w-16 border border-neutral-400 bg-neutral-300 px-2 text-sm first-of-type:ml-0 hover:brightness-95"
                onClick={() => dataCubeEngine.refreshFailedDataFetches()}
              >
                Run Action
              </button>
            </div>
          </div>
          <div className="my-2">
            <div className="font-medium">Refresh Group Node Data: Enabled</div>
            <div className="flex pr-2">
              <FormCheckbox
                label="Force refresh data when group node is opened."
                checked={gridClientPurgeClosedRowNodes}
                onChange={() =>
                  setGridClientPurgeClosedRowNodes(
                    !gridClientPurgeClosedRowNodes,
                  )
                }
              />
            </div>
          </div>
          <div className="my-2">
            <div className="font-medium">Row Buffer</div>
            <div className="mb-1.5 text-sm text-neutral-700">
              {`Sets the number of rows the grid renders outside of the viewable area. e.g. if the buffer is 10 and your grid is showing 50 rows (as that's all that fits on your screen without scrolling), then the grid will actually render 70 in total (10 extra above and 10 extra below). Then when you scroll, the grid will already have 10 rows ready and waiting to show, no redraw is needed. A low small buffer will make initial draws of the grid faster; whereas a big one will reduce the redraw visible vertically scrolling.`}
            </div>
            <div className="flex pr-2">
              <FormNumberInput
                className="w-16 text-sm"
                min={10}
                step={10}
                defaultValue={DEFAULT_GRID_CLIENT_ROW_BUFFER}
                value={gridClientRowBuffer}
                setValue={(value) => {
                  setGridClientRowBuffer(
                    value ?? DEFAULT_GRID_CLIENT_ROW_BUFFER,
                  );
                }}
              />
            </div>
          </div>

          <div className="my-2 h-[1px] w-full bg-neutral-200" />

          <div className="flex h-6">
            <div className="flex h-full">
              <div className="flex h-6 items-center text-xl font-medium">
                <DataCubeIcon.Debug />
              </div>
              <div className="ml-1 flex h-6 items-center text-xl font-medium">
                Debug
              </div>
            </div>
          </div>

          <div className="mt-1.5">
            <div className="font-medium">Debug Mode: Enabled</div>
            <div className="flex pr-2">
              <FormCheckbox
                label="Enable debug logging when running data queries, updating snapshots, etc."
                checked={enableDebugMode}
                onChange={() => setEnableDebugMode(!enableDebugMode)}
              />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="font-medium">Engine Debug Mode: Enabled</div>
            <div className="flex pr-2">
              <FormCheckbox
                label="Enable debug logging in the engine when running data queries, computing query analytics, etc."
                checked={enableEngineDebugMode}
                onChange={() =>
                  setEnableEngineDebugMode(!enableEngineDebugMode)
                }
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex h-10 items-center justify-end px-2">
        <button
          className="ml-2 h-6 w-48 border border-neutral-400 bg-neutral-300 px-2 hover:brightness-95"
          onClick={restoreDefaults}
        >
          Restore Default Settings
        </button>
        <button
          className="ml-2 h-6 w-36 border border-neutral-400 bg-neutral-300 px-2 hover:brightness-95"
          onClick={save}
        >
          Save Settings
        </button>
      </div>
    </>
  );
});
