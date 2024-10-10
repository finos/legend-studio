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

import { cn, DataCubeIcon } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { DataCubeEditorColumnSelector } from './DataCubeEditorColumnSelector.js';
import { useEffect } from 'react';
import type { DataCubeViewState } from '../../../stores/view/DataCubeViewState.js';
import { FormCheckbox } from '../../core/DataCubeFormUtils.js';
import type {
  DataCubeEditorColumnSelectorColumnState,
  DataCubeEditorColumnSelectorState,
} from '../../../stores/view/editor/DataCubeEditorColumnSelectorState.js';

const ColumnSelectorLabel = observer(
  (props: {
    selector: DataCubeEditorColumnSelectorState<DataCubeEditorColumnSelectorColumnState>;
    column: DataCubeEditorColumnSelectorColumnState;
  }) => {
    const { selector, column } = props;
    const showHiddenIndicator =
      selector.editor.columnProperties.getColumnConfiguration(
        column.name,
      ).hideFromView;

    return (
      <>
        <div
          className={cn(
            'items-center overflow-hidden overflow-ellipsis whitespace-nowrap pl-2',
            {
              'text-neutral-400': showHiddenIndicator,
            },
          )}
        >
          {column.name}
        </div>
        {Boolean(
          selector.editor.leafExtendColumns.find(
            (col) => col.name === column.name,
          ),
        ) && (
          <div className="ml-1.5 mr-0.5 flex h-3.5 flex-shrink-0 items-center rounded-sm border border-neutral-300 bg-neutral-100 px-1 text-xs font-medium uppercase text-neutral-600">
            {`Extended (Leaf Level)`}
          </div>
        )}
        {Boolean(
          selector.editor.groupExtendColumns.find(
            (col) => col.name === column.name,
          ),
        ) && (
          <div className="ml-1.5 mr-0.5 flex h-3.5 flex-shrink-0 items-center rounded-sm border border-neutral-300 bg-neutral-100 px-1 text-xs font-medium uppercase text-neutral-600">
            {`Extended (Group Level)`}
          </div>
        )}
      </>
    );
  },
);

export const DataCubeEditorColumnsPanel = observer(
  (props: { view: DataCubeViewState }) => {
    const { view } = props;
    const panel = view.editor.columns;

    useEffect(() => () => panel.propagateChanges(), [panel]);

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
              checked={panel.selector.showHiddenColumns}
              onChange={() =>
                panel.selector.setShowHiddenColumns(
                  !panel.selector.showHiddenColumns,
                )
              }
            />
          </div>
        </div>
        <div className="flex h-[calc(100%_-_24px)] w-full">
          <DataCubeEditorColumnSelector
            selector={panel.selector}
            noColumnsSelectedRenderer={() => (
              <div className="flex items-center border-[1.5px] border-neutral-200 p-2 font-semibold text-neutral-400">
                <div>
                  <DataCubeIcon.Warning className="mr-1 text-lg" />
                </div>
                No columns selected
              </div>
            )}
            columnLabelRenderer={(p) => <ColumnSelectorLabel {...p} />}
          />
        </div>
      </div>
    );
  },
);
