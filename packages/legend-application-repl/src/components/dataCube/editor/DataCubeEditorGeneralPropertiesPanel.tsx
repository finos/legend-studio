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
import { DataCubeIcon } from '@finos/legend-art';

export const DataCubeEditorGeneralPropertiesPanel = observer(() => {
  const replStore = useREPLStore();
  const panel = replStore.dataCube.editor.generalPropertiesPanel;

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
      <div className="flex h-[calc(100%_-_24px)] w-full p-4"></div>
      <div className="flex h-6 w-full items-center">
        <div className="flex h-full w-32 items-center">Report Title:</div>
        <input
          className="h-full w-full border border-neutral-300 px-2 text-lg font-semibold focus:outline-none"
          value={panel.name}
          onChange={(event) => {
            panel.setName(event.target.value);
          }}
        />
      </div>
    </div>
  );
});
