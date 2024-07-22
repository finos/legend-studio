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
import { useREPLStore } from '../REPLStoreProvider.js';
import { FormCheckbox, FormNumberInput } from './Form.js';
import {
  DEFAULT_ENABLE_DEBUG_MODE,
  DEFAULT_GRID_CLIENT_PURGE_CLOSED_ROW_NODES,
  DEFAULT_GRID_CLIENT_ROW_BUFFER,
} from '../../stores/dataCube/DataCubeEngine.js';
import { useState } from 'react';

export const SettingsPanel = observer(() => {
  const repl = useREPLStore();
  const dataCubeEngine = repl.dataCubeEngine;

  // NOTE: this makes sure the changes are not applied until saved, but it generates
  // a lot of boilerplate code, consider using a more ergonomic approach when we need
  // to scale this to more settings.
  const [gridClientRowBuffer, setGridClientRowBuffer] = useState(
    dataCubeEngine.gridClientRowBuffer,
  );
  const [gridClientPurgeClosedRowNodes, setGridClientPurgeClosedRowNodes] =
    useState(dataCubeEngine.gridClientPurgeClosedRowNodes);
  const [enableDebugMode, setEnableDebugMode] = useState(
    dataCubeEngine.enableDebugMode,
  );
  const save = () => {
    dataCubeEngine.setGridClientRowBuffer(gridClientRowBuffer);
    dataCubeEngine.setGridClientPurgeClosedRowNodes(
      gridClientPurgeClosedRowNodes,
    );
    dataCubeEngine.setEnableDebugMode(enableDebugMode);
  };
  const restoreDefaults = () => {
    setGridClientRowBuffer(DEFAULT_GRID_CLIENT_ROW_BUFFER);
    setGridClientPurgeClosedRowNodes(
      DEFAULT_GRID_CLIENT_PURGE_CLOSED_ROW_NODES,
    );
    setEnableDebugMode(DEFAULT_ENABLE_DEBUG_MODE);
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
          <div className="my-1.5">
            <div className="mb-0.5 font-medium">Refresh Group Node Data</div>
            <div className="flex pr-2">
              <FormCheckbox
                label="Force refresh data when group node is opened"
                checked={gridClientPurgeClosedRowNodes}
                onChange={() =>
                  setGridClientPurgeClosedRowNodes(
                    !gridClientPurgeClosedRowNodes,
                  )
                }
              />
            </div>
          </div>
          <div className="my-1.5">
            <div className="mb-0.5 font-medium">Row Buffer</div>
            <div className="mb-1.5 text-sm text-neutral-700">
              {`Sets the number of rows the grid renders outside of the viewable area. e.g. if the buffer is 10 and your grid is showing 50 rows (as that's all that fits on your screen without scrolling), then the grid will actually render 70 in total (10 extra above and 10 extra below). Then when you scroll, the grid will already have 10 rows ready and waiting to show, no redraw is needed. A low small buffer will make initial draws of the grid faster; whereas a big one will reduce the redraw visible vertically scrolling.`}
            </div>
            <div className="flex pr-2">
              <FormNumberInput
                className="w-20 text-sm"
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
          <div className="my-1.5">
            <div className="mb-0.5 font-medium">Debug Mode: Enabled</div>
            <div className="flex pr-2">
              <FormCheckbox
                label="Enable debug logging when running data queries, updating snapshots, etc."
                checked={enableDebugMode}
                onChange={() => setEnableDebugMode(!enableDebugMode)}
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
