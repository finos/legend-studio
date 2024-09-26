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
import type { DataCubeViewState } from '../../../stores/dataCube/DataCubeViewState.js';
import { DataCubeEditorColumnsSelector } from './DataCubeEditorColumnsSelector.js';
import { useEffect } from 'react';
import { FormBadge_WIP } from '../../shared/DataCubeFormUtils.js';

const PivotColumnSortDirectionDropdown = observer((props) => (
  <div className="relative flex h-full items-center">
    <div className="flex h-[18px] w-32 items-center border border-transparent px-2 text-sm text-neutral-400">
      Ascending
      <FormBadge_WIP />
    </div>
  </div>
));

export const DataCubeEditorHorizontalPivotsPanel = observer(
  (props: { view: DataCubeViewState }) => {
    const { view } = props;
    const panel = view.editor.horizontalPivots;

    useEffect(() => () => panel.propagateChanges(), [panel]);

    return (
      <div className="h-full w-full select-none p-2">
        <div className="flex h-6">
          <div className="flex h-6 items-center text-xl font-medium">
            <DataCubeIcon.TablePivot />
          </div>
          <div className="ml-1 flex h-6 items-center text-xl font-medium">
            Horizontal Pivots
          </div>
        </div>
        <div className="flex h-[calc(100%_-_24px)] w-full">
          <DataCubeEditorColumnsSelector
            selector={panel.selector}
            columnActionRenderer={(p) => (
              <PivotColumnSortDirectionDropdown {...p} />
            )}
          />
        </div>
      </div>
    );
  },
);
