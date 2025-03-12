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
  clsx,
  LockIcon,
  Panel,
  PanelContent,
  PanelHeader,
} from '@finos/legend-art';
import {
  DATASPACE_TAB,
  DataSpaceEditorState,
} from '../stores/DataSpaceEditorState.js';
import { prettyCONSTName } from '@finos/legend-shared';
import { DataSpaceGeneralEditor } from './DataSpaceGeneralEditor.js';
import { DataSpaceExecutionContextEditor } from './DataSpaceExecutionContextEditor.js';

export const DataSpaceEditor = observer(() => {
  const editorStore = useEditorStore();

  const dataSpaceState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);
  const selectedTab = dataSpaceState.selectedTab;

  const changeTab =
    (tab: DATASPACE_TAB): (() => void) =>
    (): void =>
      dataSpaceState.setSelectedTab(tab);

  const renderDataSpaceEditorTab = (): React.ReactNode => {
    switch (selectedTab) {
      case DATASPACE_TAB.GENERAL:
        return <DataSpaceGeneralEditor />;
      case DATASPACE_TAB.EXECUTION_CONTEXT:
        return <DataSpaceExecutionContextEditor />;
      default:
        return null;
    }
  };

  return (
    <Panel className="dataSpace-editor">
      <PanelHeader title="Data Space Editor" darkMode={true}>
        {dataSpaceState.isReadOnly && (
          <div className="uml-element-editor__header__lock">
            <LockIcon />
          </div>
        )}
        <div className="uml-element-editor__tabs">
          {Object.values(DATASPACE_TAB).map((tab) => (
            <div
              key={tab}
              onClick={changeTab(tab)}
              className={clsx('dataspace-editor__tab', {
                'dataspace-editor__tab--active': tab === selectedTab,
              })}
            >
              {prettyCONSTName(tab)}
            </div>
          ))}
        </div>
      </PanelHeader>
      <PanelContent darkMode={true}>{renderDataSpaceEditorTab()}</PanelContent>
    </Panel>
  );
});
