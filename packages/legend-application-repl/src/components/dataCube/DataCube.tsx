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
import { useEffect } from 'react';
import { DataCubeGrid } from './grid/DataCubeGrid.js';
import { useApplicationStore } from '@finos/legend-application';
import {
  DataCubeIcon,
  DropdownMenu,
  DropdownMenuItem,
  ProgressBar,
  useDropdownMenu,
} from '@finos/legend-art';
import { LayoutManager } from '../repl/LayoutManager.js';
import type { DataCubeState } from '../../stores/dataCube/DataCubeState.js';
import { INTERNAL__MonacoEditorWidgetsRoot } from '../repl/PureCodeEditor.js';
import { useDataCubeStore } from '../DataCubeStoreProvider.js';

const DataCubeStatusBar = observer((props: { dataCube: DataCubeState }) => {
  const { dataCube } = props;

  return (
    <div className="flex h-5 w-full justify-between bg-neutral-100">
      <div className="flex">
        <button
          className="flex items-center px-2 text-sky-600 hover:text-sky-700"
          onClick={() => dataCube.editor.display.open()}
        >
          <DataCubeIcon.Settings className="text-xl" />
          <div className="pl-0.5 underline">Properties</div>
        </button>
        <div className="flex">
          <button
            className="flex items-center text-sky-600 hover:text-sky-700"
            onClick={() => {
              dataCube.filter.display.open();
            }}
          >
            <DataCubeIcon.TableFilter className="text-lg" />
            <div className="pl-0.5 underline">Filter</div>
          </button>
        </div>
      </div>
      <div className="flex items-center px-2">
        <div className="flex h-3.5 w-48 border-[0.5px] border-neutral-300">
          {dataCube.runningTasks.size > 0 && (
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

const DataCubeTitleBar = observer((props: { dataCube: DataCubeState }) => {
  const { dataCube } = props;
  const application = useApplicationStore();
  const [openMenuDropdown, closeMenuDropdown, menuDropdownProps] =
    useDropdownMenu();

  return (
    <div className="flex h-6 justify-between bg-neutral-100">
      <div className="flex select-none items-center pl-1 pr-2 text-lg font-medium">
        <DataCubeIcon.Cube className="mr-1 h-4 w-4" />
        <div>{dataCube.info.name}</div>
      </div>
      <div>
        <button
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center text-lg"
          onClick={openMenuDropdown}
        >
          <DataCubeIcon.Menu />
        </button>
        <DropdownMenu
          {...menuDropdownProps}
          menuProps={{
            anchorOrigin: { vertical: 'top', horizontal: 'left' },
            transformOrigin: { vertical: 'top', horizontal: 'right' },
            classes: {
              paper: 'rounded-none mt-[1px]',
              list: 'w-36 p-0 rounded-none border border-neutral-400 bg-white max-h-40 overflow-y-auto py-0.5',
            },
          }}
        >
          <DropdownMenuItem
            className="flex h-[22px] w-full items-center px-2.5 text-base hover:bg-neutral-100 focus:bg-neutral-100"
            onClick={() => {
              if (application.documentationService.url) {
                application.navigationService.navigator.visitAddress(
                  application.documentationService.url,
                );
              }
              closeMenuDropdown();
            }}
            // disabled={!application.documentationService.url}
            disabled={true} // TODO: enable when we set up the documentation website
          >
            See Documentation
          </DropdownMenuItem>
          <div className="my-0.5 h-[1px] w-full bg-neutral-200" />
          <DropdownMenuItem
            className="flex h-[22px] w-full items-center px-2.5 text-base hover:bg-neutral-100 focus:bg-neutral-100"
            onClick={() => {
              dataCube.store.settingsDisplay.open();
              closeMenuDropdown();
            }}
          >
            Settings...
          </DropdownMenuItem>
        </DropdownMenu>
      </div>
    </div>
  );
});

export const DataCube = observer(() => {
  const dataCubeStore = useDataCubeStore();
  const application = dataCubeStore.application;
  const dataCube = dataCubeStore.dataCubeState;

  useEffect(() => {
    dataCube.initialize().catch(application.logUnhandledError);
  }, [dataCube, application]);

  return (
    <div className="data-cube relative flex h-full w-full flex-col bg-white">
      <DataCubeTitleBar dataCube={dataCube} />
      <DataCubeGrid dataCube={dataCube} />
      <DataCubeStatusBar dataCube={dataCube} />
      <LayoutManager layoutManagerState={dataCubeStore.layout} />

      <INTERNAL__MonacoEditorWidgetsRoot />
    </div>
  );
});
