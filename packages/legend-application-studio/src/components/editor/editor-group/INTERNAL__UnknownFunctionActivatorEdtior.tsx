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
import { useEditorStore } from '../EditorStoreProvider.js';
import { INTERNAL__UnknownFunctionActivatorEdtiorState } from '../../../stores/editor/editor-state/element-editor-state/INTERNAL__UnknownFunctionActivatorEditor.js';
import { BlankPanelContent, Panel } from '@finos/legend-art';
import { useApplicationStore } from '@finos/legend-application';
import { flowResult } from 'mobx';

export const INTERNAL__UnknownFunctionActivatorEdtior = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const editorState = editorStore.tabManagerState.getCurrentEditorState(
    INTERNAL__UnknownFunctionActivatorEdtiorState,
  );
  const validate = (): void => {
    flowResult(editorState.validate()).catch(
      applicationStore.alertUnhandledError,
    );
  };
  const publishToSandbox = (): void => {
    flowResult(editorState.publishToSandbox()).catch(
      applicationStore.alertUnhandledError,
    );
  };

  return (
    <div className="function-activator-editor">
      <Panel>
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">
              function activator
            </div>
          </div>
        </div>
        <div className="panel__content">
          <div className="function-activator-editor__content">
            {/* TODO-PR */}
            <BlankPanelContent>Work In Progress</BlankPanelContent>
            <div className="function-activator-editor__footer">
              <button
                className="function-activator-editor__footer__action btn--dark"
                onClick={validate}
                disabled={editorState.validateState.isInProgress}
                tabIndex={-1}
              >
                Validate
              </button>
              <button
                className="function-activator-editor__footer__action btn--dark"
                onClick={publishToSandbox}
                disabled={editorState.publishToSandboxState.isInProgress}
                tabIndex={-1}
              >
                Publish to Sandbox
              </button>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
});
