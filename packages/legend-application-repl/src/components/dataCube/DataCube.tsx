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
import { useEffect, useRef } from 'react';
import { DataCubeGrid } from './grid/DataCubeGrid.js';
import { DataCubeEditor } from './editor/DataCubeEditor.js';
import { useApplicationStore } from '@finos/legend-application';

export const DataCubeStatusBar = observer(() => {
  const dataCubeStore = useREPLStore();
  const dataCubeState = dataCubeStore.dataCubeState;

  return (
    <div className="flex w-full">
      <button
        className="flex w-1/2 items-center px-2 text-sky-600 underline"
        onClick={(): void => dataCubeState.editor.openPanel()}
      >
        Pivot
      </button>
      <button className="flex w-1/2 items-center px-2 text-sky-600 underline">
        Filter
      </button>
    </div>
  );
});

export const DataCube = observer(() => {
  const dataCubeStore = useREPLStore();
  const ref = useRef<HTMLDivElement>(null);
  const applicationStore = useApplicationStore();
  const dataCubeState = dataCubeStore.dataCubeState;

  useEffect(() => {
    dataCubeState.initialize().catch(applicationStore.alertUnhandledError);
  }, [dataCubeState, applicationStore]);

  return (
    <div
      ref={ref}
      className="data-cube relative flex h-full w-full flex-col bg-white"
    >
      <div className="flex h-6 justify-between bg-neutral-100">
        <div className="flex select-none items-center px-2">
          <div>{dataCubeState.editor.generalPropertiesPanel.name}</div>
          {/* TODO: @akphi - add save icon */}
        </div>
      </div>
      <div className="flex-1">
        <DataCubeGrid />
      </div>
      <div className="flex h-5 bg-neutral-100">
        <DataCubeStatusBar />
      </div>
      {dataCubeState.editor.isPanelOpen && (
        <DataCubeEditor containerRef={ref} />
      )}
    </div>
  );
});
