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
  type SelectComponent,
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
  ControlledDropdownMenu,
  MenuContent,
  MenuContentItem,
  CaretDownIcon,
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
import { SnowflakeM2MUdfFunctionActivatorEdtiorState } from '../../../../stores/editor/editor-state/element-editor-state/function-activator/SnowflakeM2MUdfFunctionActivatorEditorState.js';
import { flowResult } from 'mobx';
import { useRef } from 'react';
import {
  type RelationalDatabaseConnectionOption,
  buildRelationalDatabaseConnectionOption,
} from '../connection-editor/RelationalDatabaseConnectionEditor.js';
import { ActivatorOwnershipForm } from './ActivatorFormComponents.js';
import { ActivatorArtifactViewer } from './ActivatorArtifactViewer.js';

export const SnowflakeM2MUdfFunctionActivatorEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const editorState = editorStore.tabManagerState.getCurrentEditorState(
    SnowflakeM2MUdfFunctionActivatorEdtiorState,
  );
  const isReadOnly = editorState.isReadOnly;
  const activator = editorState.activator;

  const connectionSelectorRef = useRef<SelectComponent>(null);
  const connectionFilterOption = createFilter({
    ignoreCase: true,
    ignoreAccents: false,
    stringify: (option: { data: RelationalDatabaseConnectionOption }): string =>
      option.data.value.path,
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
    if (!isReadOnly && val.value === activationConnection) {
      return;
    }
    editorState.updateConnection(val.value);
  };
  const changeDescription: React.ChangeEventHandler<HTMLTextAreaElement> = (
    event,
  ) => {
    if (!isReadOnly) {
      editorState.updateAppDescription(event.target.value);
    }
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
  const renderArtifact = (): void => {
    flowResult(editorState.renderArtifact()).catch(
      applicationStore.alertUnhandledError,
    );
  };
  const deploy = (): void => {
    flowResult(editorState.deployToSandbox()).catch(
      applicationStore.alertUnhandledError,
    );
  };

  return (
    <div className="snowflake-m2m-udf-function-activator-editor">
      <Panel>
        <PanelHeader title="Snowflake M2M Udf Application" />
        <PanelLoadingIndicator
          isLoading={Boolean(
            editorState.validateState.isInProgress ||
              editorState.renderArtifactState.isInProgress ||
              editorState.deployState.isInProgress,
          )}
        />
        <PanelContent>
          <div className="snowflake-m2m-udf-function-activator-editor__header">
            <div className="snowflake-m2m-udf-function-activator-editor__header__label">
              SnowflakeM2MUdf Activator Metadata
            </div>
            <div className="snowflake-m2m-udf-function-activator-editor__header__actions">
              <div className="snowflake-m2m-udf-function-activator-editor__header__actions btn__dropdown-combo--primary">
                <button
                  className="snowflake-m2m-udf-function-activator-editor__header__actions__action snowflake-m2m-udf-function-activator-editor__header__actions__action--primary"
                  onClick={validate}
                  disabled={editorState.validateState.isInProgress}
                  tabIndex={-1}
                  title="Click Validate to verify your activator before deployment"
                >
                  Validate
                </button>
                <ControlledDropdownMenu
                  className="snowflake-m2m-udf-function-activator-editor__header__actions btn__dropdown-combo btn__dropdown-combo__dropdown-btn"
                  title="activator-artifact-dropdown"
                  content={
                    <MenuContent>
                      <MenuContentItem
                        className="btn__dropdown-combo__option"
                        onClick={renderArtifact}
                      >
                        Render Artifact
                      </MenuContentItem>
                    </MenuContent>
                  }
                  menuProps={{
                    anchorOrigin: {
                      vertical: 'bottom',
                      horizontal: 'right',
                    },
                    transformOrigin: {
                      vertical: 'top',
                      horizontal: 'right',
                    },
                  }}
                >
                  <CaretDownIcon />
                </ControlledDropdownMenu>
              </div>
              <div className="snowflake-m2m-udf-function-activator-editor__header__actions btn__dropdown-combo--primary">
                <button
                  className="snowflake-m2m-udf-function-activator-editor__header__actions__action snowflake-m2m-udf-function-activator-editor__header__actions__action--primary"
                  onClick={deploy}
                  disabled={editorState.deployState.isInProgress}
                  title="Deploy to sandbox"
                  tabIndex={-1}
                >
                  Deploy to Sandbox
                </button>
              </div>
            </div>
          </div>
          <PanelForm>
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Function
              </div>
            </div>
            <div className="snowflake-m2m-udf-function-activator-editor__configuration__items">
              <div className="snowflake-m2m-udf-function-activator-editor__configuration__item">
                <div className="btn--sm snowflake-m2m-udf-function-activator-editor__configuration__item__label">
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
                  className="btn--dark btn--sm snowflake-m2m-udf-function-activator-editor__configuration__item__btn"
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
            <div className="snowflake-m2m-udf-function-activator-editor__configuration__items">
              <div className="snowflake-m2m-udf-function-activator-editor__configuration__item">
                <div className="btn--sm snowflake-m2m-udf-function-activator-editor__configuration__item__label">
                  <PURE_ConnectionIcon />
                </div>
                <CustomSelectorInput
                  inputRef={connectionSelectorRef}
                  className="snowflake-m2m-udf-function-activator-editor__config__connection-selector__input"
                  options={connectionOptions}
                  onChange={changeConnection}
                  value={
                    activationConnection
                      ? buildRelationalDatabaseConnectionOption(
                          activationConnection,
                        )
                      : undefined
                  }
                  darkMode={
                    !applicationStore.layoutService
                      .TEMPORARY__isLightColorThemeEnabled
                  }
                  placeholder="Choose a connection"
                  filterOption={connectionFilterOption}
                />
                <button
                  className="btn--dark btn--sm snowflake-m2m-udf-function-activator-editor__configuration__item__btn"
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
              value={activator.udfName}
              isReadOnly={isReadOnly}
              name="Activator Identifer"
              placeholder="Specify the name of the UDF for this activator..."
              update={(value: string | undefined): void =>
                editorState.updateUdfName(value ?? '')
              }
            />
          </PanelForm>
          <PanelForm>
            <PanelFormTextField
              value={activator.deploymentSchema}
              isReadOnly={isReadOnly}
              name="Deployment Schema"
              placeholder="Specify the deployment schema"
              update={(value: string | undefined): void =>
                editorState.updateDeploymentSchema(value)
              }
            />
          </PanelForm>
          <PanelForm>
            <PanelFormTextField
              value={activator.deploymentStage}
              isReadOnly={isReadOnly}
              name="Deployment Stage"
              placeholder="Specify the deployment stage"
              update={(value: string | undefined): void =>
                editorState.updateDeploymentStage(value)
              }
            />
          </PanelForm>
          <PanelForm>
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Description
              </div>
              <div className="panel__content__form__section__header__prompt">{`Provide a brief description of Snowflake M2M Udf`}</div>
              <textarea
                className="panel__content__form__section__textarea service-editor__documentation__input"
                spellCheck={false}
                disabled={isReadOnly}
                value={activator.description}
                onChange={changeDescription}
              />
            </div>
          </PanelForm>
          <PanelForm>
            <ActivatorOwnershipForm
              activator={activator}
              isReadOnly={isReadOnly}
            />
          </PanelForm>
          <ActivatorArtifactViewer
            artifact={editorState.artifact}
            setArtifact={(value) => editorState.setArtifact(value)}
            darkMode={
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
          />
        </PanelContent>
      </Panel>
    </div>
  );
});
