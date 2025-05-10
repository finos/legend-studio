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
import { DataCubeEditorTab } from '../../../stores/view/editor/DataCubeEditorState.js';
import { DataCubeEditorSortsPanel } from './DataCubeEditorSortsPanel.js';
import { DataCubeEditorGeneralPropertiesPanel } from './DataCubeEditorGeneralPropertiesPanel.js';
import { DataCubeEditorColumnsPanel } from './DataCubeEditorColumnsPanel.js';
import { DataCubeEditorVerticalPivotsPanel } from './DataCubeEditorVerticalPivotsPanel.js';
import { DataCubeEditorHorizontalPivotsPanel } from './DataCubeEditorHorizontalPivotsPanel.js';
import { DataCubeEditorColumnPropertiesPanel } from './DataCubeEditorColumnPropertiesPanel.js';
import { cn } from '@finos/legend-art';
import type { DataCubeViewState } from '../../../stores/view/DataCubeViewState.js';
import { FormButton } from '../../core/DataCubeFormUtils.js';
import { useDataCube } from '../../DataCubeProvider.js';
import { DataCubeEditorDimensionsPanel } from './DataCubeEditorDimensionsPanel.js';
import { DataCubeEvent } from '../../../__lib__/DataCubeEvent.js';
import { isDimensionalGridMode } from '../../../stores/core/DataCubeQueryEngine.js';

export const DataCubeEditor = observer((props: { view: DataCubeViewState }) => {
  const dataCube = useDataCube();
  const alertService = dataCube.alertService;

  const { view } = props;
  const editor = view.editor;
  const selectedTab = editor.currentTab;
  const tabs = [
    DataCubeEditorTab.COLUMNS,
    DataCubeEditorTab.HORIZONTAL_PIVOTS,
    DataCubeEditorTab.VERTICAL_PIVOTS,
    DataCubeEditorTab.DIMENSIONS,
    DataCubeEditorTab.SORTS,
    DataCubeEditorTab.GENERAL_PROPERTIES,
    DataCubeEditorTab.COLUMN_PROPERTIES,
  ];
  //TODO: Add support to make changes to other tabs for dimensional grid mode
  const dimensionTabs = [DataCubeEditorTab.DIMENSIONS];

  const logApplyChangesFromPropertiesEditor = (): void => {
    view.dataCube.telemetryService.sendTelemetry(
      DataCubeEvent.APPLY_CHANGES_PROPERTIES,
      view.engine.getDataFromSource(view.getInitialSource()),
    );
  };

  return (
    <>
      <div className="relative h-[calc(100%_-_40px)] w-full px-2 pt-8">
        <div className="absolute top-0 flex h-9 w-[calc(100%_-_16px)] overflow-y-hidden pt-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => editor.setCurrentTab(tab)}
              disabled={
                isDimensionalGridMode(view.info.configuration.gridMode) &&
                !dimensionTabs.includes(tab)
              }
              className={cn(
                'relative flex h-6 items-center justify-center whitespace-nowrap border border-b-0 border-l-0 border-neutral-300 px-2 first:border-l focus:z-10 disabled:text-neutral-400',
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
            <DataCubeEditorColumnsPanel view={view} />
          )}
          {selectedTab === DataCubeEditorTab.HORIZONTAL_PIVOTS && (
            <DataCubeEditorHorizontalPivotsPanel view={view} />
          )}
          {selectedTab === DataCubeEditorTab.VERTICAL_PIVOTS && (
            <DataCubeEditorVerticalPivotsPanel view={view} />
          )}
          {selectedTab === DataCubeEditorTab.DIMENSIONS && (
            <DataCubeEditorDimensionsPanel view={view} />
          )}
          {selectedTab === DataCubeEditorTab.SORTS && (
            <DataCubeEditorSortsPanel view={view} />
          )}
          {selectedTab === DataCubeEditorTab.GENERAL_PROPERTIES && (
            <DataCubeEditorGeneralPropertiesPanel view={view} />
          )}
          {selectedTab === DataCubeEditorTab.COLUMN_PROPERTIES && (
            <DataCubeEditorColumnPropertiesPanel view={view} />
          )}
        </div>
      </div>
      <div className="flex h-10 items-center justify-end px-2">
        <FormButton onClick={() => editor.display.close()}>Cancel</FormButton>
        <FormButton
          className="ml-2"
          disabled={editor.finalizationState.isInProgress}
          onClick={() => {
            logApplyChangesFromPropertiesEditor();
            editor
              .applyChanges()
              .catch((error) => alertService.alertUnhandledError(error));
          }}
        >
          Apply
        </FormButton>
        <FormButton
          className="ml-2"
          disabled={editor.finalizationState.isInProgress}
          onClick={() => {
            logApplyChangesFromPropertiesEditor();
            editor
              .applyChanges({ closeAfterApply: true })
              .catch((error) => alertService.alertUnhandledError(error));
          }}
        >
          OK
        </FormButton>
      </div>
    </>
  );
});
