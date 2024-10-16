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

import { DataCubeIcon, ProgressBar } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import type { DataCubeViewState } from '../stores/view/DataCubeViewState.js';
import { DataCubeGrid } from './view/grid/DataCubeGrid.js';

const DataCubeStatusBar = observer((props: { view: DataCubeViewState }) => {
  const { view } = props;

  return (
    <div className="flex h-5 w-full justify-between bg-neutral-100">
      <div className="flex">
        <button
          className="flex items-center px-2 text-sky-600 hover:text-sky-700"
          onClick={() => view.editor.display.open()}
        >
          <DataCubeIcon.Settings className="text-xl" />
          <div className="pl-0.5 underline">Properties</div>
        </button>
        <div className="flex">
          <button
            className="flex items-center text-sky-600 hover:text-sky-700"
            onClick={() => {
              view.filter.display.open();
            }}
          >
            <DataCubeIcon.TableFilter className="text-lg" />
            <div className="pl-0.5 underline">Filter</div>
          </button>
        </div>
      </div>
      <div className="flex items-center px-2">
        <div className="flex h-3.5 w-48 border-[0.5px] border-neutral-300">
          {view.runningTasks.size > 0 && (
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

export const DataCubeView = observer((props: { view: DataCubeViewState }) => {
  const { view } = props;

  return (
    <>
      <DataCubeGrid view={view} />
      <DataCubeStatusBar view={view} />
    </>
  );
});
