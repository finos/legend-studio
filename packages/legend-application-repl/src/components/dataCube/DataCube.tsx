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
import { useREPLStore } from '../REPLStoreProvider.js';
import { useEffect, useRef, useState } from 'react';
import { DataCubeGrid } from './grid/DataCubeGrid.js';
import { DataCubeEditor } from './editor/DataCubeEditor.js';
import { useApplicationStore } from '@finos/legend-application';
import { DataCubeIcon, ProgressBar } from '@finos/legend-art';

const DataCubeStatusBar = observer(() => {
  const dataCubeStore = useREPLStore();
  const dataCube = dataCubeStore.dataCube;

  return (
    <div className="flex h-5 w-full justify-between bg-neutral-100">
      <div className="flex flex-1">
        <button
          className="pl-2 text-sky-600 hover:text-sky-700"
          title="See Documentation"
        >
          <DataCubeIcon.Documentation className="text-xl" />
        </button>
        <button
          className="flex items-center px-3 text-sky-600 hover:text-sky-700"
          onClick={(): void => dataCube.editor.openPanel()}
        >
          <DataCubeIcon.Settings className="text-xl" />
          <div className="pl-0.5 underline">Properties</div>
        </button>
        <div className="flex-1">
          <button className="flex items-center text-sky-600 hover:text-sky-700">
            <DataCubeIcon.TableFilter className="text-lg" />
            <div className="pl-0.5 underline">Filter</div>
          </button>
        </div>
      </div>
      <div className="flex items-center px-2">
        <div className="flex h-3.5 w-48 border-[0.5px] border-neutral-300">
          {dataCube.runningTaskes.size > 0 && (
            <ProgressBar
              classes={{
                root: 'h-3.5 w-full bg-transparent',
                bar1Indeterminate: 'bg-green-500',
                bar2Indeterminate: 'bg-green-500',
              }}
              variant="indeterminate"
            />
          )}
        </div>
      </div>
    </div>
  );
});

const DataCubeTitleBar = observer(() => {
  const dataCubeStore = useREPLStore();
  const dataCube = dataCubeStore.dataCube;

  return (
    <div className="flex h-6 justify-between bg-neutral-100">
      <div className="flex select-none items-center pl-1 pr-2 text-lg font-medium">
        <DataCubeIcon.Cube className="mr-1 h-4 w-4" />
        <div>{dataCube.editor.generalPropertiesPanel.name}</div>
        {/* TODO: @akphi - add save icon */}
      </div>
    </div>
  );
});

export const DataCube = observer(() => {
  const dataCubeStore = useREPLStore();
  const ref = useRef<HTMLDivElement>(null);
  const applicationStore = useApplicationStore();
  const dataCube = dataCubeStore.dataCube;

  useEffect(() => {
    dataCube.initialize().catch(applicationStore.logUnhandledError);
  }, [dataCube, applicationStore]);

  return (
    <div
      ref={ref}
      className="data-cube relative flex h-full w-full flex-col bg-white"
    >
      <DataCubeTitleBar />
      <DataCubeGrid />
      <DataCubeStatusBar />
      {dataCube.editor.isPanelOpen && <DataCubeEditor containerRef={ref} />}
    </div>
  );
});
