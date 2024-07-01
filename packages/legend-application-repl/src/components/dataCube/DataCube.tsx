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
import { DataCubeIcon } from '@finos/legend-art';

const DataCubeStatusBar = observer(() => {
  const dataCubeStore = useREPLStore();
  const dataCubeState = dataCubeStore.dataCubeState;

  return (
    <div className="flex h-5 w-full bg-neutral-100">
      <button className="pl-2">
        <DataCubeIcon.Documentation className="text-xl text-sky-600" />
      </button>
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

const DataCubeTitleBar = observer(() => {
  const dataCubeStore = useREPLStore();
  const dataCubeState = dataCubeStore.dataCubeState;
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const handleButtonClick = () => {
    setDropdownVisible(!dropdownVisible);
  };

  const handleOptionClick = (option: string) => {
    setDropdownVisible(false);
    if (option === 'excel') {
      dataCubeState.grid.generateExcelFile();
    } else if (option === 'csv') {
      dataCubeState.grid.generateCSVFile();
    }
  };
  return (
    <div className="flex h-6 justify-between bg-neutral-100">
      <div className="flex select-none items-center pl-1 pr-2 text-lg font-medium">
        <DataCubeIcon.Cube className="mr-1 h-4 w-4" />
        <div>{dataCubeState.editor.generalPropertiesPanel.name}</div>
        {/* TODO: @akphi - add save icon */}
        <div className="btn_container relative">
          <button
            className="generate_formats"
            onClick={handleButtonClick}
            // onClick={dataCubeState.grid.generateExcelFile}
          >
            Click here
          </button>
          {dropdownVisible && (
            <div className="relative left-10 z-10 mt-20 w-48 rounded border bg-white shadow-lg">
              <div
                className="cursor-pointer px-4 py-2 hover:bg-gray-200"
                onClick={() => {
                  handleOptionClick('excel');
                }}
              >
                Export To Excel
              </div>
              <div
                className="curosor-pointer px-4 py-2 hover:bg-gray-200"
                onClick={() => handleOptionClick('csv')}
              >
                Convert To CSV
              </div>
            </div>
          )}
        </div>
        {dataCubeState.grid.isLoading && (
          <div className="loading-indicator">
            <span>Loading...</span>
          </div>
        )}
      </div>
    </div>
  );
});

export const DataCube = observer(() => {
  const dataCubeStore = useREPLStore();
  const ref = useRef<HTMLDivElement>(null);
  const applicationStore = useApplicationStore();
  const dataCubeState = dataCubeStore.dataCubeState;

  useEffect(() => {
    dataCubeState.initialize().catch(applicationStore.logUnhandledError);
  }, [dataCubeState, applicationStore]);

  return (
    <div
      ref={ref}
      className="data-cube relative flex h-full w-full flex-col bg-white"
    >
      <DataCubeTitleBar />
      <DataCubeGrid />
      <DataCubeStatusBar />
      {dataCubeState.editor.isPanelOpen && (
        <DataCubeEditor containerRef={ref} />
      )}
    </div>
  );
});
