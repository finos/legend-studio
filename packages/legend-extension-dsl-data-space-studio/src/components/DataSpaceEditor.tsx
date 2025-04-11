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
import { EyeIcon, Panel, PanelContent, PanelHeader } from '@finos/legend-art';
import { DataSpaceEditorState } from '../stores/DataSpaceEditorState.js';
import { DataSpaceGeneralEditor } from './DataSpaceGeneralEditor/DataSpaceGeneralEditor.js';
import { DataSpacePreviewState } from '../stores/DataSpacePreviewState.js';
import { flowResult } from 'mobx';
import { isStubbed_PackageableElement } from '@finos/legend-graph';

export const DataSpaceEditor = observer(() => {
  const editorStore = useEditorStore();

  const dataSpaceState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);

  const dataSpace = dataSpaceState.dataSpace;

  const dataSpacePreviewState =
    DataSpacePreviewState.retrieveNullableState(editorStore);
  if (!dataSpacePreviewState) {
    return null;
  }

  const validPreviewState = (): boolean => {
    const stubDefault = Boolean(
      isStubbed_PackageableElement(
        dataSpace.defaultExecutionContext.defaultRuntime.value,
      ) &&
        isStubbed_PackageableElement(
          dataSpace.defaultExecutionContext.mapping.value,
        ),
    );
    return Boolean(!stubDefault);
  };

  const previewDataSpace = (): void => {
    flowResult(
      dataSpacePreviewState.previewDataSpace(dataSpaceState.dataSpace),
    ).catch(editorStore.applicationStore.alertUnhandledError);
  };

  return (
    <Panel className="dataSpace-editor">
      <PanelHeader
        title="Data Product"
        titleContent={dataSpaceState.dataSpace.name}
        darkMode={true}
        isReadOnly={dataSpaceState.isReadOnly}
      />
      <PanelHeader title="General" darkMode={true}>
        <div className="panel__header__actions">
          <div className="btn__dropdown-combo btn__dropdown-combo--primary">
            <button
              className="btn__dropdown-combo__label"
              onClick={previewDataSpace}
              title="Preview Data Product"
              tabIndex={-1}
              disabled={!validPreviewState()}
            >
              <EyeIcon className="btn__dropdown-combo__label__icon" />
              <div className="btn__dropdown-combo__label__title">Preview</div>
            </button>
          </div>
        </div>
      </PanelHeader>

      <PanelContent>
        <DataSpaceGeneralEditor />
      </PanelContent>
    </Panel>
  );
});
