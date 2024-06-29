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
import { useREPLStore } from '../../REPLStoreProvider.js';
import {
  DataCubeIcon,
  DropdownMenu,
  DropdownMenuItem,
  useDropdownMenu,
} from '@finos/legend-art';
import { WIP_Badge } from '../../shared/WIP.js';

export const DataCubeEditorGeneralPropertiesPanel = observer(() => {
  const replStore = useREPLStore();
  const panel = replStore.dataCube.editor.generalPropertiesPanel;
  const configuration = panel.configuration;
  const [
    openInitialExpandLevelDropdown,
    closeInitialExpandLevelDropdown,
    initialExpandLevelDropdownProps,
  ] = useDropdownMenu();

  return (
    <div className="data-cube-column-selector h-full w-full p-2">
      <div className="flex h-6">
        <div className="flex h-6 items-center text-xl font-medium">
          <DataCubeIcon.TableOptions />
        </div>
        <div className="ml-1 flex h-6 items-center text-xl font-medium">
          General Properties
        </div>
      </div>
      <div className="flex h-[calc(100%_-_24px)] w-full">
        <div className="h-full w-full py-2">
          <div className="flex h-6 w-full items-center">
            <div className="flex h-full w-28 flex-shrink-0 items-center text-sm">
              Report Title:
            </div>
            <input
              className="h-full w-full border border-neutral-300 px-2 text-lg font-semibold"
              value={panel.name}
              onChange={(event) => {
                panel.setName(event.target.value);
              }}
            />
          </div>
          <div className="mt-2 flex h-6 w-full items-center">
            <div className="flex h-full w-28 flex-shrink-0 items-center text-sm">
              Initially expand to level:
            </div>
            <button
              className="flex h-6 w-8 items-center justify-between border border-neutral-500 pl-2 pr-0.5 text-sm text-neutral-700"
              onClick={openInitialExpandLevelDropdown}
            >
              <div>
                {configuration.initialExpandLevel
                  ? configuration.initialExpandLevel
                  : ''}
              </div>
              <div>
                <DataCubeIcon.CaretDown />
              </div>
            </button>
            <DropdownMenu
              className="w-8 border border-neutral-300 bg-white"
              {...initialExpandLevelDropdownProps}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((level) => (
                <DropdownMenuItem
                  className="flex h-5 items-center px-2 text-sm hover:bg-neutral-100 focus-visible:bg-neutral-100"
                  key={level}
                  onClick={() => {
                    configuration.setInitialExpandLevel(level);
                    closeInitialExpandLevelDropdown();
                  }}
                >
                  {level !== 0 ? level : ''}
                </DropdownMenuItem>
              ))}
            </DropdownMenu>
            <WIP_Badge />
          </div>
        </div>
      </div>
    </div>
  );
});
