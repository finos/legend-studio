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

import {
  Panel,
  PanelHeader,
  PanelContent,
  PanelForm,
  PURE_FunctionIcon,
  LongArrowRightIcon,
  PanelLoadingIndicator,
  PanelFormBooleanField,
  PanelFormValidatedTextField,
  TimesIcon,
  PanelFormTextField,
} from '@finos/legend-art';
import {
  generateFunctionPrettyName,
  validate_ServicePattern,
} from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import { useApplicationStore } from '@finos/legend-application';
import { useEditorStore } from '../../EditorStoreProvider.js';
import { RestServiceFunctionActivatorEditorState } from '../../../../stores/editor/editor-state/element-editor-state/function-activator/RestServiceFunctionActivatorEditorState.js';
import { flowResult } from 'mobx';
import {
  restService_setAutoActivateUpdates,
  restService_setDocumentation,
  restService_setPattern,
  restService_removePatternParameter,
  restService_setStoreModel,
  restService_setGenerateLineage,
  restService_setHost,
  restService_setPort,
  restService_setPath,
} from '../../../../stores/graph-modifier/DSL_FunctionActivator_GraphModifierHelper.js';
import { useEffect, useRef, useState } from 'react';

export const RestServiceFunctionActivatorEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const editorState = editorStore.tabManagerState.getCurrentEditorState(
    RestServiceFunctionActivatorEditorState,
  );
  const activator = editorState.activator;
  const visitFunction = (): void =>
    editorState.editorStore.graphEditorMode.openElement(
      activator.function.value,
    );
  const validate = (): void => {
    flowResult(editorState.validate()).catch(
      applicationStore.alertUnhandledError,
    );
  };
  const deploy = (): void => {
    flowResult(editorState.deployToSandbox()).catch(
      applicationStore.alertUnhandledError,
    );
  };

  const changeDocumentation: React.ChangeEventHandler<HTMLTextAreaElement> = (
    event,
  ) => {
    restService_setDocumentation(activator, event.target.value);
  };

  const toggleUseStoreModel = (): void => {
    restService_setStoreModel(activator, !activator.storeModel);
  };

  const toggleGenerateLineage = (): void => {
    restService_setGenerateLineage(activator, !activator.generateLineage);
  };

  const toggleAutoActivateUpdates = (): void => {
    restService_setAutoActivateUpdates(
      activator,
      !activator.autoActivateUpdates,
    );
  };

  const getValidationMessage = (inputPattern: string): string | undefined => {
    const patternValidationResult = validate_ServicePattern(inputPattern);
    return patternValidationResult
      ? patternValidationResult.messages[0]
      : undefined;
  };

  //Deployment Configurations
  const updateHost = (host: string): void => {
    restService_setHost(activator, host);
  };

  const updatePort: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    restService_setPort(activator, parseInt(event.target.value, 10));
  };

  const updatePath = (path: string): void => {
    restService_setPath(activator, path);
  };

  //Pattern
  const patternRef = useRef<HTMLInputElement>(null);
  const [pattern, setPattern] = useState(activator.pattern);
  const updatePattern = (newPattern: string): void => {
    restService_setPattern(activator, newPattern);
  };

  const removePatternParameter =
    (val: string): (() => void) =>
    (): void => {
      restService_removePatternParameter(activator, val);
      setPattern(activator.pattern);
    };

  useEffect(() => {
    patternRef.current?.focus();
  }, [editorState]);

  return (
    <div className="rest-service-function-activator-editor">
      <Panel>
        <PanelHeader title="Rest Service Application" />
        <PanelLoadingIndicator
          isLoading={Boolean(
            editorState.validateState.isInProgress ||
              editorState.deployState.isInProgress,
          )}
        />
        <PanelContent>
          <div className="rest-service-function-activator-editor__header">
            <div className="rest-service-function-activator-editor__header__label">
              Rest Service Activator
            </div>
            <div className="rest-service-function-activator-editor__header__actions">
              <button
                className="rest-service-function-activator-editor__header__actions__action rest-service-function-activator-editor__header__actions__action--primary"
                onClick={validate}
                disabled={editorState.validateState.isInProgress}
                tabIndex={-1}
                title="Click Validate to verify your activator before deployment"
              >
                Validate
              </button>
              <button
                className="rest-service-function-activator-editor__header__actions__action rest-service-function-activator-editor__header__actions__action--primary"
                onClick={deploy}
                disabled={editorState.deployState.isInProgress}
                title="Deploy to sandbox"
                tabIndex={-1}
              >
                Deploy to Sandbox
              </button>
            </div>
          </div>
          <PanelForm>
            <PanelFormValidatedTextField
              ref={patternRef}
              name="URL Pattern"
              className="service-editor__pattern__input"
              errorMessageClassName="service-editor__pattern__input"
              prompt={
                <>
                  Specifies the URL pattern of the service (e.g. /myService/
                  <span className="service-editor__pattern__example__param">{`{param}`}</span>
                  )
                </>
              }
              update={(value: string | undefined): void => {
                updatePattern(value ?? '');
              }}
              validate={getValidationMessage}
              value={pattern}
            />
          </PanelForm>
          <PanelForm>
            <div className="panel__content__form__section service-editor__parameters">
              <div className="panel__content__form__section__header__label">
                Parameters
              </div>
              <div className="panel__content__form__section__header__prompt">
                URL parameters (each must be surrounded by curly braces) will be
                passed as arguments for the execution query. Note that if the
                service is configured to use multi-execution, one of the URL
                parameters must be chosen as the execution key.
              </div>
              <div className="service-editor__parameters__list">
                {!activator.patternParameters.length && (
                  <div className="service-editor__parameters__list__empty">
                    No parameter
                  </div>
                )}
                {Boolean(activator.patternParameters.length) &&
                  activator.patternParameters.map((parameter) => (
                    <div key={parameter} className="service-editor__parameter">
                      <div className="service-editor__parameter__text">
                        {parameter}
                      </div>
                      <div className="service-editor__parameter__actions">
                        <button
                          className="service-editor__parameter__action"
                          onClick={removePatternParameter(parameter)}
                          title="Remove parameter"
                          tabIndex={-1}
                        >
                          <TimesIcon />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </PanelForm>
          <PanelForm>
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Function
              </div>
            </div>
            <div className="rest-service-function-activator-editor__configuration__items">
              <div className="rest-service-function-activator-editor__configuration__item">
                <div className="btn--sm rest-service-function-activator-editor__configuration__item__label">
                  <PURE_FunctionIcon />
                </div>
                <input
                  className="panel__content__form__section__input"
                  spellCheck={false}
                  disabled={true}
                  value={generateFunctionPrettyName(activator.function.value, {
                    fullPath: true,
                    spacing: false,
                  })}
                />
                <button
                  className="btn--dark btn--sm rest-service-function-activator-editor__configuration__item__btn"
                  onClick={visitFunction}
                  tabIndex={-1}
                  title="See Function"
                >
                  <LongArrowRightIcon />
                </button>
              </div>
            </div>
          </PanelForm>
          <PanelForm>
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Documentation
              </div>
              <div className="panel__content__form__section__header__prompt">{`Provide a brief description of the service's functionalities and usage`}</div>
              <textarea
                className="panel__content__form__section__textarea service-editor__documentation__input"
                spellCheck={false}
                value={activator.documentation}
                onChange={changeDocumentation}
              />
            </div>
          </PanelForm>
          <PanelForm>
            <PanelFormTextField
              name="Host"
              className="service-editor__pattern__input"
              update={(value: string | undefined): void => {
                updateHost(value ?? '');
              }}
              value={activator.activationConfiguration.host}
            />
          </PanelForm>
          <PanelForm>
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Port
              </div>
              <input
                className="panel__content__form__section__input panel__content__form__section__number-input"
                type="number"
                value={activator.activationConfiguration.port}
                onChange={updatePort}
              />
            </div>
          </PanelForm>
          <PanelForm>
            <PanelFormTextField
              name="Path"
              className="service-editor__pattern__input"
              update={(value: string | undefined): void => {
                updatePath(value ?? '');
              }}
              value={activator.activationConfiguration.path}
            />
          </PanelForm>
          <PanelForm>
            <PanelFormBooleanField
              value={activator.autoActivateUpdates}
              name="Auto Activate Updates"
              prompt="Specifies if the new generation should be automatically activated;
          only valid when latest revision is selected upon service
          registration"
              update={toggleAutoActivateUpdates}
            />
          </PanelForm>
          <PanelForm>
            <PanelFormBooleanField
              value={activator.storeModel}
              name="Store Model"
              prompt="Use Store Model (slower)"
              update={toggleUseStoreModel}
            />
          </PanelForm>
          <PanelForm>
            <PanelFormBooleanField
              value={activator.generateLineage}
              name="Generate Lineage"
              prompt="Generate Lineage (slower)"
              update={toggleGenerateLineage}
            />
          </PanelForm>
        </PanelContent>
      </Panel>
    </div>
  );
});
