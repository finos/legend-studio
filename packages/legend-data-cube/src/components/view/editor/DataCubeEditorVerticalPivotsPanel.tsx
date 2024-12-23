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

import { DataCubeIcon } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { DataCubeEditorColumnSelector } from './DataCubeEditorColumnSelector.js';
import type { DataCubeViewState } from '../../../stores/view/DataCubeViewState.js';

export const DataCubeEditorVerticalPivotsPanel = observer(
  (props: { view: DataCubeViewState }) => {
    const { view } = props;
    const panel = view.editor.verticalPivots;
    const darkMode = view.dataCube.settings.darkMode;

    return (
      <div className="h-full w-full select-none p-2">
        <div className="flex h-6">
          <div className="flex h-6 items-center text-xl font-medium">
            <DataCubeIcon.TableGroupBy />
          </div>
          <div className="ml-1 flex h-6 items-center text-xl font-medium">
            Vertical Pivots
          </div>
        </div>
        <div className="flex h-[calc(100%_-_24px)] w-full">
          <DataCubeEditorColumnSelector
            selector={panel.selector}
            darkMode={darkMode}
          />
        </div>
      </div>
    );
  },
);
