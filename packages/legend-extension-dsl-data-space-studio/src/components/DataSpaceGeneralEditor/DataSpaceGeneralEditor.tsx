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

import { useEditorStore } from '@finos/legend-application-studio';
import { PanelContentLists } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import {
  DATA_SPACE_TAB,
  DataSpaceEditorState,
} from '../../stores/DataSpaceEditorState.js';
import { DataSpaceSidebar } from './DataSpaceSidebar.js';
import { DataSpaceHomeTab } from './DataSpaceHomeTab.js';
import { DataSpaceExecutionContextEditor } from '../DataSpaceExecutionContextEditor.js';
import { DataspaceExecutablesSection } from './DataSpaceExecutablesSection.js';

export const DataSpaceGeneralEditor = observer(() => {
  const editorStore = useEditorStore();
  const dataSpaceState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);

  const renderTab = (): React.ReactNode => {
    switch (dataSpaceState.selectedTab) {
      case DATA_SPACE_TAB.EXECUTION_CONTEXTS:
        return <DataSpaceExecutionContextEditor />;
      case DATA_SPACE_TAB.EXECUTABLES:
        return <DataspaceExecutablesSection />;
      case DATA_SPACE_TAB.HOME:
      default:
        return <DataSpaceHomeTab />;
    }
  };

  return (
    <PanelContentLists className="dataSpace-editor__general">
      <DataSpaceSidebar
        selectedTab={dataSpaceState.selectedTab}
        setSelectedTab={(tab): void => dataSpaceState.setSelectedTab(tab)}
      />
      <div className="dataSpace-editor__general__content">{renderTab()}</div>
    </PanelContentLists>
  );
});
