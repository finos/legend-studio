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
import { DataQualityServiceValidationSideBar } from './DataQualitySideBar.js';
import { useEditorStore } from '@finos/legend-application-studio';
import { DataQualityServiceValidationState } from './states/DataQualityServiceValidationState.js';
import { DataQualityValidationEditor } from './DataQualityValidationEditor.js';
import { ResizablePanel, ResizablePanelGroup } from '@finos/legend-art';
import { DataQualityExplorerPanel } from './DataQualityExplorerPanel.js';

export const DataQualityServiceValidationEditor = observer(() => {
  const editorStore = useEditorStore();
  const dataQualityServiceValidationState =
    editorStore.tabManagerState.getCurrentEditorState(
      DataQualityServiceValidationState,
    );
  return (
    <DataQualityValidationEditor
      dataQualityState={dataQualityServiceValidationState}
      SideBarBasisComponent={
        <DataQualityServiceValidationSideBar
          dataQualityState={dataQualityServiceValidationState}
        >
          <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel minSize={40} direction={1}>
              <DataQualityExplorerPanel
                dataQualityState={dataQualityServiceValidationState}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </DataQualityServiceValidationSideBar>
      }
    />
  );
});
