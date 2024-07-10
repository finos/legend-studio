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
import { DATA_CUBE_EDITOR_TAB } from '../../../stores/dataCube/editor/DataCubeEditorState.js';
import { useREPLStore } from '../../REPLStoreProvider.js';
import { DataCubeEditorSortsPanel } from './DataCubeEditorSortsPanel.js';
import { DataCubeEditorGeneralPropertiesPanel } from './DataCubeEditorGeneralPropertiesPanel.js';
import { DataCubeEditorColumnsPanel } from './DataCubeEditorColumnsPanel.js';
import { DataCubeEditorVerticalPivotsPanel } from './DataCubeEditorVerticalPivotsPanel.js';
import { DataCubeEditorHorizontalPivotsPanel } from './DataCubeEditorHorizontalPivotsPanel.js';
import { DataCubeEditorFilterPanel } from './DataCubeEditorFilterPanel.js';
import { DataCubeEditorExtendedColumnsPanel } from './DataCubeEditorExtendedColumnsPanel.js';
import { DataCubeEditorCodePanel } from './DataCubeEditorCodePanel.js';
import { DataCubeEditorColumnPropertiesPanel } from './DataCubeEditorColumnPropertiesPanel.js';
import { REPLWindow } from '../../REPLWindow.js';
import { cn } from '@finos/legend-art';

export const DataCubeEditor = observer(
  (props: { containerRef: React.RefObject<HTMLDivElement> }) => {
    const { containerRef } = props;
    const replStore = useREPLStore();
    const editor = replStore.dataCube.editor;
    const selectedTab = editor.currentTab;
    const tabs = [
      DATA_CUBE_EDITOR_TAB.GENERAL_PROPERTIES,
      DATA_CUBE_EDITOR_TAB.COLUMN_PROPERTIES,
      DATA_CUBE_EDITOR_TAB.FILTER,
      DATA_CUBE_EDITOR_TAB.EXTENDED_COLUMNS,
      DATA_CUBE_EDITOR_TAB.COLUMNS,
      DATA_CUBE_EDITOR_TAB.VERTICAL_PIVOTS,
      DATA_CUBE_EDITOR_TAB.HORIZONTAL_PIVOTS,
      DATA_CUBE_EDITOR_TAB.SORTS,
      DATA_CUBE_EDITOR_TAB.CODE,
    ];

    return (
      <REPLWindow
        containerRef={containerRef}
        config={editor.window}
        onClose={() => editor.closePanel()}
      >
        <div className="relative h-[calc(100%_-_40px)] flex-1 px-2 pt-8">
          <div className="absolute top-0 flex h-9 w-[calc(100%_-_16px)] min-w-[400px] overflow-auto pt-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={(): void => editor.setCurrentTab(tab)}
                className={cn(
                  'relative flex h-6 items-center justify-center whitespace-nowrap border border-b-0 border-l-0 border-neutral-300 px-2 first:border-l focus:z-10',
                  {
                    '-top-0.5 h-[27px] border-b-0 bg-white':
                      tab === selectedTab,
                  },
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="h-full w-full overflow-auto border border-neutral-300 bg-white">
            {selectedTab === DATA_CUBE_EDITOR_TAB.GENERAL_PROPERTIES && (
              <DataCubeEditorGeneralPropertiesPanel />
            )}
            {selectedTab === DATA_CUBE_EDITOR_TAB.COLUMN_PROPERTIES && (
              <DataCubeEditorColumnPropertiesPanel />
            )}
            {selectedTab === DATA_CUBE_EDITOR_TAB.FILTER && (
              <DataCubeEditorFilterPanel />
            )}
            {selectedTab === DATA_CUBE_EDITOR_TAB.EXTENDED_COLUMNS && (
              <DataCubeEditorExtendedColumnsPanel />
            )}
            {selectedTab === DATA_CUBE_EDITOR_TAB.COLUMNS && (
              <DataCubeEditorColumnsPanel />
            )}
            {selectedTab === DATA_CUBE_EDITOR_TAB.SORTS && (
              <DataCubeEditorSortsPanel />
            )}
            {selectedTab === DATA_CUBE_EDITOR_TAB.VERTICAL_PIVOTS && (
              <DataCubeEditorVerticalPivotsPanel />
            )}
            {selectedTab === DATA_CUBE_EDITOR_TAB.HORIZONTAL_PIVOTS && (
              <DataCubeEditorHorizontalPivotsPanel />
            )}
            {selectedTab === DATA_CUBE_EDITOR_TAB.CODE && (
              <DataCubeEditorCodePanel />
            )}
          </div>
        </div>
        <div className="flex h-10 items-center justify-end px-2">
          <button
            className="h-6 w-20 border border-neutral-400 bg-neutral-300 px-2 hover:brightness-95"
            onClick={(): void => {
              editor.applyChanges();
              editor.closePanel();
            }}
          >
            OK
          </button>
          <button
            className="ml-2 h-6 w-20 border border-neutral-400 bg-neutral-300 px-2 hover:brightness-95"
            onClick={() => editor.closePanel()}
          >
            Cancel
          </button>
          <button
            className="ml-2 h-6 w-20 border border-neutral-400 bg-neutral-300 px-2 hover:brightness-95"
            onClick={() => editor.applyChanges()}
          >
            Apply
          </button>
        </div>
      </REPLWindow>
    );
  },
);
