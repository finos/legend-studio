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
import type { TaskManager } from '../stores/services/DataCubeTaskService.js';
import { at } from '@finos/legend-shared';
import { DataCubeEvent } from '../__lib__/DataCubeEvent.js';
import { DataCubeOpenEditorSource } from '../stores/core/DataCubeQueryEngine.js';

export const DataCubeStatusBar = observer(
  (props: {
    view?: DataCubeViewState | undefined;
    taskManager?: TaskManager | undefined;
  }) => {
    const { view, taskManager } = props;
    const tasks = view?.taskService.tasks ?? taskManager?.tasks;

    const logOpeningPropertiesEditor = () => {
      view?.dataCube.telemetryService.sendTelemetry(
        DataCubeEvent.OPEN_EDITOR_PROPERTIES,
        {
          ...view.engine.getDataFromSource(view.getInitialSource()),
          openedFrom: DataCubeOpenEditorSource.STATUS_BAR,
        },
      );
    };

    const logOpeningFilterEditor = () => {
      view?.dataCube.telemetryService.sendTelemetry(
        DataCubeEvent.OPEN_EDITOR_FILTER,
        {
          ...view.engine.getDataFromSource(view.getInitialSource()),
          openedFrom: DataCubeOpenEditorSource.STATUS_BAR,
        },
      );
    };

    return (
      <div className="flex h-5 w-full justify-between bg-neutral-100">
        <div className="flex">
          <button
            className="flex items-center px-2 text-sky-600 hover:text-sky-700 disabled:text-neutral-400"
            onClick={() => {
              view?.editor.display.open();
              logOpeningPropertiesEditor();
            }}
            disabled={!view}
          >
            <DataCubeIcon.Settings className="text-xl" />
            <div className="pl-0.5 underline">Properties</div>
          </button>
          <div className="flex">
            <button
              className="flex items-center text-sky-600 hover:text-sky-700 disabled:text-neutral-400"
              onClick={() => {
                view?.filter.display.open();
                logOpeningFilterEditor();
              }}
              disabled={!view}
            >
              <DataCubeIcon.TableFilter className="text-lg" />
              <div className="pl-0.5 underline">Filter</div>
            </button>
          </div>
        </div>
        <div className="flex items-center px-2">
          <div
            className="flex h-3.5 w-48 border-[0.5px] border-neutral-300"
            title={
              tasks !== undefined && tasks.length > 0
                ? tasks.length > 1
                  ? tasks
                      .map(
                        (task, idx) =>
                          `Task ${idx + 1}/${tasks.length}: ${task.description}`,
                      )
                      .join('\n')
                  : at(tasks, 0).description
                : undefined
            }
          >
            {tasks !== undefined && tasks.length > 0 && (
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
  },
);
