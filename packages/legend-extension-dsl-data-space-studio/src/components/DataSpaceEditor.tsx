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
import { useEditorStore } from '@finos/legend-application-studio';
import {
  Panel,
  PanelContent,
  PanelHeader,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
} from '@finos/legend-art';
import { DataSpaceEditorState } from '../stores/DataSpaceEditorState.js';
import { DataSpaceGeneralEditor } from './DataSpaceGeneralEditor.js';
import { DataSpaceExecutionContextEditor } from './DataSpaceExecutionContextEditor.js';

export const DataSpaceEditor = observer(() => {
  const editorStore = useEditorStore();

  const dataSpaceState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);

  return (
    <Panel className="dataSpace-editor">
      <PanelHeader
        title="DataSpace"
        titleContent={dataSpaceState.dataSpace.name}
        darkMode={true}
        isReadOnly={dataSpaceState.isReadOnly}
      />
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel size={400} minSize={200}>
          <PanelHeader title="General" darkMode={true} />
          <PanelContent>
            <DataSpaceGeneralEditor />
          </PanelContent>
        </ResizablePanel>
        <ResizablePanelSplitter>
          <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
        </ResizablePanelSplitter>
        <ResizablePanel minSize={200}>
          <PanelHeader title="Execution Contexts" darkMode={true} />
          <PanelContent>
            <DataSpaceExecutionContextEditor />
          </PanelContent>
        </ResizablePanel>
      </ResizablePanelGroup>
    </Panel>
  );
});
