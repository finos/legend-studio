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
import { DataCubeEditorTab } from '../../../stores/dataCube/editor/DataCubeEditorState.js';
import { DataCubeEditorSortsPanel } from './DataCubeEditorSortsPanel.js';
import { DataCubeEditorGeneralPropertiesPanel } from './DataCubeEditorGeneralPropertiesPanel.js';
import { DataCubeEditorColumnsPanel } from './DataCubeEditorColumnsPanel.js';
import { DataCubeEditorVerticalPivotsPanel } from './DataCubeEditorVerticalPivotsPanel.js';
import { DataCubeEditorHorizontalPivotsPanel } from './DataCubeEditorHorizontalPivotsPanel.js';
import { DataCubeEditorCodePanel } from './DataCubeEditorCodePanel.js';
import { DataCubeEditorColumnPropertiesPanel } from './DataCubeEditorColumnPropertiesPanel.js';
import { cn } from '@finos/legend-art';
import type { DataCubeState } from '../../../stores/dataCube/DataCubeState.js';
import { useApplicationStore } from '@finos/legend-application';

export const DataCubeEditor = observer((props: { dataCube: DataCubeState }) => {
  const { dataCube } = props;
  const editor = dataCube.editor;
  const application = useApplicationStore();
  const selectedTab = editor.currentTab;
  const tabs = [
    DataCubeEditorTab.COLUMNS,
    DataCubeEditorTab.VERTICAL_PIVOTS,
    DataCubeEditorTab.HORIZONTAL_PIVOTS,
    DataCubeEditorTab.SORTS,
    DataCubeEditorTab.GENERAL_PROPERTIES,
    DataCubeEditorTab.COLUMN_PROPERTIES,
    DataCubeEditorTab.CODE,
  ];

  return (
    <>
      <div className="relative h-[calc(100%_-_40px)] w-full px-2 pt-8">
        <div className="absolute top-0 flex h-9 w-[calc(100%_-_16px)] overflow-y-hidden pt-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => editor.setCurrentTab(tab)}
              className={cn(
                'relative flex h-6 items-center justify-center whitespace-nowrap border border-b-0 border-l-0 border-neutral-300 px-2 first:border-l focus:z-10',
                {
                  '-top-0.5 h-[27px] border-b-0 bg-white': tab === selectedTab,
                },
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="h-full w-full overflow-auto border border-neutral-300 bg-white">
          {selectedTab === DataCubeEditorTab.COLUMNS && (
            <DataCubeEditorColumnsPanel dataCube={dataCube} />
          )}
          {selectedTab === DataCubeEditorTab.VERTICAL_PIVOTS && (
            <DataCubeEditorVerticalPivotsPanel dataCube={dataCube} />
          )}
          {selectedTab === DataCubeEditorTab.HORIZONTAL_PIVOTS && (
            <DataCubeEditorHorizontalPivotsPanel dataCube={dataCube} />
          )}
          {selectedTab === DataCubeEditorTab.SORTS && (
            <DataCubeEditorSortsPanel dataCube={dataCube} />
          )}
          {selectedTab === DataCubeEditorTab.GENERAL_PROPERTIES && (
            <DataCubeEditorGeneralPropertiesPanel dataCube={dataCube} />
          )}
          {selectedTab === DataCubeEditorTab.COLUMN_PROPERTIES && (
            <DataCubeEditorColumnPropertiesPanel dataCube={dataCube} />
          )}
          {selectedTab === DataCubeEditorTab.CODE && (
            <DataCubeEditorCodePanel dataCube={dataCube} />
          )}
        </div>
      </div>
      <div className="flex h-10 items-center justify-end px-2">
        <button
          className="h-6 w-20 border border-neutral-400 bg-neutral-300 px-2 hover:brightness-95"
          disabled={editor.finalizationState.isInProgress}
          onClick={() => {
            editor
              .applyChanges({ closeAfterApply: true })
              .catch(application.alertUnhandledError);
          }}
        >
          OK
        </button>
        <button
          className="ml-2 h-6 w-20 border border-neutral-400 bg-neutral-300 px-2 hover:brightness-95"
          onClick={() => editor.display.close()}
        >
          Cancel
        </button>
        <button
          className="ml-2 h-6 w-20 border border-neutral-400 bg-neutral-300 px-2 hover:brightness-95"
          disabled={editor.finalizationState.isInProgress}
          onClick={() => {
            editor.applyChanges().catch(application.alertUnhandledError);
          }}
        >
          Apply
        </button>
      </div>
    </>
  );
});
