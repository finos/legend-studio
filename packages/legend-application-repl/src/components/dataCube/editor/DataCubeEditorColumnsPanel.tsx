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
import { DataCubeEditorColumnsSelector } from './DataCubeEditorColumnsSelector.js';
import { FormCheckbox } from '../../repl/Form.js';
import { DataCubeEditorColumnsSelectorHiddenColumnsVisibility } from '../../../stores/dataCube/editor/DataCubeEditorColumnsSelectorState.js';
import { useEffect } from 'react';
import type { DataCubeState } from '../../../stores/dataCube/DataCubeState.js';

export const DataCubeEditorColumnsPanel = observer(
  (props: { dataCube: DataCubeState }) => {
    const { dataCube } = props;
    const panel = dataCube.editor.columns;

    useEffect(() => () => panel.propagateColumnSelectionChanges(), [panel]);

    return (
      <div className="h-full w-full select-none p-2">
        <div className="flex h-6 justify-between">
          <div className="flex h-full">
            <div className="flex h-6 items-center text-xl font-medium">
              <DataCubeIcon.TableColumns />
            </div>
            <div className="ml-1 flex h-6 items-center text-xl font-medium">
              Columns
            </div>
          </div>
          <div className="flex h-full items-center pr-2">
            <FormCheckbox
              label="Show hidden columns?"
              checked={
                panel.selector.hiddenColumnsVisibility !==
                DataCubeEditorColumnsSelectorHiddenColumnsVisibility.HIDDEN
              }
              onChange={() =>
                panel.selector.setHiddenColumnsVisibility(
                  panel.selector.hiddenColumnsVisibility !==
                    DataCubeEditorColumnsSelectorHiddenColumnsVisibility.HIDDEN
                    ? DataCubeEditorColumnsSelectorHiddenColumnsVisibility.HIDDEN
                    : DataCubeEditorColumnsSelectorHiddenColumnsVisibility.VISIBLE_WITH_WARNING,
                )
              }
            />
          </div>
        </div>
        <div className="flex h-[calc(100%_-_24px)] w-full">
          <DataCubeEditorColumnsSelector
            selector={panel.selector}
            noColumnsSelectedRenderer={() => (
              <div className="flex items-center border-[1.5px] border-red-400 p-2 font-semibold text-red-500">
                <div>
                  <DataCubeIcon.Warning className="mr-1 text-lg" />
                </div>
                No columns selected
              </div>
            )}
          />
        </div>
      </div>
    );
  },
);
