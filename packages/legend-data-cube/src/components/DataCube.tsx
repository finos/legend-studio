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

import { observer, useLocalObservable } from 'mobx-react-lite';
import {
  DataCubeIcon,
  DropdownMenu,
  DropdownMenuItem,
  useDropdownMenu,
} from '@finos/legend-art';
import { DataCubeLayoutManager } from './core/DataCubeLayoutManager.js';
import { INTERNAL__MonacoEditorWidgetsRoot } from './core/DataCubePureCodeEditorUtils.js';
import { DataCubeBlockingActionAlert } from './core/DataCubeAlert.js';
import { DataCubeView } from './DataCubeView.js';
import { useEffect } from 'react';
import type { DataCubeEngine } from '../stores/core/DataCubeEngine.js';
import { DataCubeState } from '../stores/DataCubeState.js';
import { type DataCubeOptions } from '../stores/DataCubeOptions.js';
import { DataCubeContextProvider, useDataCube } from './DataCubeProvider.js';
import type { DataCubeQuery } from '../stores/core/models/DataCubeQuery.js';
import { FormBadge_WIP } from './core/DataCubeFormUtils.js';

const DataCubeTitleBar = observer(() => {
  const dataCube = useDataCube();
  const engine = dataCube.engine;
  const view = dataCube.view;
  const [openMenuDropdown, closeMenuDropdown, menuDropdownProps] =
    useDropdownMenu();

  return (
    <div className="flex h-7 justify-between bg-neutral-100">
      <div className="flex select-none items-center pl-1 pr-2 text-lg font-medium">
        <DataCubeIcon.Cube className="mr-1 h-4 w-4" />
        <div>{view.info.name}</div>
      </div>
      <div className="flex">
        {dataCube.innerHeaderComponent?.(dataCube) ?? null}
        <button
          className="flex aspect-square h-full flex-shrink-0 items-center justify-center text-lg"
          onClick={openMenuDropdown}
        >
          <DataCubeIcon.Menu />
        </button>
        <DropdownMenu
          {...menuDropdownProps}
          menuProps={{
            anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
            transformOrigin: { vertical: 'top', horizontal: 'left' },
            classes: {
              paper: 'rounded-none mt-[1px]',
              list: 'w-40 p-0 rounded-none border border-neutral-400 bg-white max-h-40 overflow-y-auto py-0.5',
            },
          }}
        >
          <DropdownMenuItem
            className="flex h-[22px] w-full items-center px-2.5 text-base hover:bg-neutral-100 focus:bg-neutral-100"
            onClick={() => {
              const url = engine.getDocumentationURL();
              if (url) {
                engine.openLink(url);
              }
              closeMenuDropdown();
            }}
            disabled={true} // TODO: enable when we set up the documentation website
          >
            See Documentation
            <FormBadge_WIP />
          </DropdownMenuItem>
          <div className="my-0.5 h-[1px] w-full bg-neutral-200" />
          <DropdownMenuItem
            className="flex h-[22px] w-full items-center px-2.5 text-base hover:bg-neutral-100 focus:bg-neutral-100"
            onClick={() => {
              view.dataCube.settingsDisplay.open();
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

const DataCubeRoot = observer(() => {
  const dataCube = useDataCube();
  const engine = dataCube.engine;
  const view = dataCube.view;

  useEffect(() => {
    dataCube.view
      .initialize(dataCube.query)
      .catch((error) => dataCube.engine.logUnhandledError(error));
  }, [dataCube]);

  return (
    <div className="data-cube relative flex h-full w-full flex-col bg-white">
      <DataCubeTitleBar />

      <DataCubeView view={view} />

      <DataCubeLayoutManager layout={engine.layout} />
      <DataCubeBlockingActionAlert />
      <INTERNAL__MonacoEditorWidgetsRoot />
    </div>
  );
});

export const DataCube = observer(
  (props: {
    query: DataCubeQuery;
    engine: DataCubeEngine;
    options?: DataCubeOptions | undefined;
  }) => {
    const { query, engine, options } = props;
    const state = useLocalObservable(
      () => new DataCubeState(query, engine, options),
    );

    useEffect(() => {
      state
        .initialize()
        .catch((error) => state.engine.logUnhandledError(error));
    }, [state]);

    if (!state.initState.hasSucceeded) {
      return <></>;
    }
    return (
      <DataCubeContextProvider value={state}>
        <DataCubeRoot />
      </DataCubeContextProvider>
    );
  },
);
