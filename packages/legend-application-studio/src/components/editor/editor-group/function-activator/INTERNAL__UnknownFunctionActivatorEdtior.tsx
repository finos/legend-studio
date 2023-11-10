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
import { useEditorStore } from '../../EditorStoreProvider.js';
import { INTERNAL__UnknownFunctionActivatorEdtiorState } from '../../../../stores/editor/editor-state/element-editor-state/function-activator/INTERNAL__UnknownFunctionActivatorEditorState.js';
import {
  ArrowRightIcon,
  BlankPanelContent,
  Panel,
  PanelContent,
  PanelHeader,
} from '@finos/legend-art';
import { useApplicationStore } from '@finos/legend-application';
import { flowResult } from 'mobx';
import { ProtocolValueBuilder } from '../ProtocolValueBuilder.js';
import {
  extractAnnotatedElementDocumentation,
  generateFunctionPrettyName,
  getClassProperty,
} from '@finos/legend-graph';
import { returnUndefOnError } from '@finos/legend-shared';

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

  // function
  const valueBuilderState = editorState.protocolValueBuilderState;
  const functionFieldProperty = valueBuilderState
    ? returnUndefOnError(() =>
        getClassProperty(valueBuilderState.type, 'function'),
      )
    : undefined;
  const functionFieldDocumentation = functionFieldProperty
    ? extractAnnotatedElementDocumentation(functionFieldProperty)
    : undefined;

  return (
    <div className="function-activator-editor">
      <Panel>
        <PanelHeader title="function activator" />
        <PanelContent>
          <div className="function-activator-editor__content">
            {valueBuilderState && (
              <>
                <div className="panel__content__form">
                  <div className="panel__content__form__section">
                    <div className="panel__content__form__section__header__label">
                      Function
                    </div>
                    {functionFieldDocumentation && (
                      <div className="panel__content__form__section__header__prompt">
                        {functionFieldDocumentation}
                      </div>
                    )}
                    <div className="function-activator-editor__function-pointer">
                      <input
                        className="panel__content__form__section__input"
                        spellCheck={false}
                        disabled={true}
                        value={generateFunctionPrettyName(
                          editorState.activator.function.value,
                          {
                            fullPath: true,
                            spacing: false,
                          },
                        )}
                      />
                      <button
                        className="function-activator-editor__function-pointer__visit-btn btn--dark"
                        title="Go to Function"
                        onClick={() =>
                          editorStore.graphEditorMode.openElement(
                            editorState.activator.function.value,
                          )
                        }
                      >
                        <ArrowRightIcon />
                      </button>
                    </div>
                  </div>
                  <div className="panel__content__form__section">
                    <div className="panel__content__form__section__divider"></div>
                  </div>
                </div>
                <ProtocolValueBuilder builderState={valueBuilderState} />
              </>
            )}
            {!valueBuilderState && (
              <BlankPanelContent>{`Can't display function activator in form mode`}</BlankPanelContent>
            )}
          </div>
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
        </PanelContent>
      </Panel>
    </div>
  );
});
