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
  PanelFormTextField,
  PURE_FunctionIcon,
  LongArrowRightIcon,
  PanelLoadingIndicator,
  PURE_ConnectionIcon,
  CustomSelectorInput,
  createFilter,
  type SelectComponent,
  QuestionCircleIcon,
} from '@finos/legend-art';
import {
  type PackageableConnection,
  generateFunctionPrettyName,
  RelationalDatabaseConnection,
  DatabaseType,
} from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import { useApplicationStore } from '@finos/legend-application';
import { useEditorStore } from '../../EditorStoreProvider.js';
import { SnowflakeAppFunctionActivatorEdtiorState } from '../../../../stores/editor/editor-state/element-editor-state/function-activator/SnowflakeAppFunctionActivatorEditorState.js';
import { flowResult } from 'mobx';
import { useRef } from 'react';
import {
  buildRelationalDatabaseConnectionOption,
  type RelationalDatabaseConnectionOption,
} from '../connection-editor/RelationalDatabaseConnectionEditor.js';

export const SnowflakeAppFunctionActivatorEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const editorState = editorStore.tabManagerState.getCurrentEditorState(
    SnowflakeAppFunctionActivatorEdtiorState,
  );
  const activator = editorState.activator;
  const connectionSelectorRef = useRef<SelectComponent>(null);
  const connectionFilterOption = createFilter({
    ignoreCase: true,
    ignoreAccents: false,
    stringify: (option: RelationalDatabaseConnectionOption): string =>
      option.value.path,
  });
  const connectionOptions = editorStore.graphManagerState.usableConnections
    .filter(
      (connection) =>
        connection.connectionValue instanceof RelationalDatabaseConnection &&
        connection.connectionValue.type === DatabaseType.Snowflake,
    )
    .map(buildRelationalDatabaseConnectionOption);

  const initializeActivationConnection = (
    val: PackageableConnection | undefined,
  ): PackageableConnection | undefined => {
    if (val) {
      editorState.updateConnection(val);
    }
    return !val
      ? undefined
      : activator.activationConfiguration.activationConnection
          ?.packageableConnection.value;
  };

  const activationConnection = activator.activationConfiguration
    .activationConnection
    ? activator.activationConfiguration.activationConnection
        .packageableConnection.value
    : initializeActivationConnection(connectionOptions.at(0)?.value);

  const changeConnection = (val: RelationalDatabaseConnectionOption): void => {
    if (val.value === activationConnection) {
      return;
    }
    editorState.updateConnection(val.value);
  };
  const changeDescription: React.ChangeEventHandler<HTMLTextAreaElement> = (
    event,
  ) => {
    editorState.updateAppDescription(event.target.value);
  };
  const visitFunction = (): void =>
    editorState.editorStore.graphEditorMode.openElement(
      activator.function.value,
    );
  const visitConnection = (): void => {
    if (activationConnection) {
      editorState.editorStore.graphEditorMode.openElement(activationConnection);
    }
  };
  const validate = (): void => {
    flowResult(editorState.validate()).catch(
      applicationStore.alertUnhandledError,
    );
  };
  const deploy = (): void => {
    flowResult(editorState.deploy()).catch(
      applicationStore.alertUnhandledError,
    );
  };

  return (
    <div className="snowflake-app-function-activator-editor">
      <Panel>
        <PanelHeader title="Snowflake Application" />
        <PanelLoadingIndicator
          isLoading={Boolean(
            editorState.validateState.isInProgress ||
              editorState.deployState.isInProgress,
          )}
        />
        <PanelContent>
          <div className="snowflake-app-function-activator-editor__header">
            <div className="snowflake-app-function-activator-editor__header__label">
              Snowflake Activator Metadata
            </div>
            <div className="snowflake-app-function-activator-editor__header__actions">
              <button
                className="snowflake-app-function-activator-editor__header__actions__action"
                onClick={validate}
                disabled={editorState.validateState.isInProgress}
                tabIndex={-1}
                title="Click Validate to verify your activator before deployment"
              >
                Validate
                <QuestionCircleIcon
                  title="Click Validate to verify your activator before deployment"
                  className={
                    'snowflake-app-function-activator-editor__header__actions__action__icon'
                  }
                />
              </button>
              <button
                className="snowflake-app-function-activator-editor__header__actions__action snowflake-app-function-activator-editor__header__actions__action--primary"
                onClick={deploy}
                disabled={editorState.deployState.isInProgress}
                title="Publish to sandbox"
                tabIndex={-1}
              >
                Deploy
              </button>
            </div>
          </div>
          <PanelForm>
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Function
              </div>
            </div>
            <div className="snowflake-app-function-activator-editor__configuration__items">
              <div className="snowflake-app-function-activator-editor__configuration__item">
                <div className="btn--sm snowflake-app-function-activator-editor__configuration__item__label">
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
                  className="btn--dark btn--sm snowflake-app-function-activator-editor__configuration__item__btn"
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
                Connection
              </div>
            </div>
            <div className="snowflake-app-function-activator-editor__configuration__items">
              <div className="snowflake-app-function-activator-editor__configuration__item">
                <div className="btn--sm snowflake-app-function-activator-editor__configuration__item__label">
                  <PURE_ConnectionIcon />
                </div>
                <CustomSelectorInput
                  ref={connectionSelectorRef}
                  className="snowflake-app-function-activator-editor__config__connection-selector__input"
                  options={connectionOptions}
                  onChange={changeConnection}
                  value={
                    activationConnection
                      ? buildRelationalDatabaseConnectionOption(
                          activationConnection,
                        )
                      : undefined
                  }
                  darkMode={true}
                  placeholder="Choose a connection"
                  filterOption={connectionFilterOption}
                />
                <button
                  className="btn--dark btn--sm snowflake-app-function-activator-editor__configuration__item__btn"
                  onClick={visitConnection}
                  disabled={!activationConnection}
                  tabIndex={-1}
                  title="See Connection"
                >
                  <LongArrowRightIcon />
                </button>
              </div>
            </div>
          </PanelForm>
          <PanelForm>
            <PanelFormTextField
              value={activator.applicationName}
              name="Activator Identifer"
              placeholder="Specify the name of the UDTF for this activator..."
              update={(value: string | undefined): void =>
                editorState.updateApplicationName(value ?? '')
              }
            />
          </PanelForm>
          <PanelForm>
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Description
              </div>
              <div className="panel__content__form__section__header__prompt">{`Provide a brief description of Snowflake App`}</div>
              <textarea
                className="panel__content__form__section__textarea service-editor__documentation__input"
                spellCheck={false}
                value={activator.description}
                onChange={changeDescription}
              />
            </div>
          </PanelForm>
        </PanelContent>
      </Panel>
    </div>
  );
});
