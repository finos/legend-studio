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
  CustomSelectorInput,
  PencilIcon,
  ErrorIcon,
} from '@finos/legend-art';
import {
  DeploymentOwner,
  UserList,
  generateFunctionPrettyName,
  validate_ServicePattern,
} from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import { useApplicationStore } from '@finos/legend-application';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  HostedServiceFunctionActivatorEditorState,
  OWNERSHIP_OPTIONS,
  type HostedServiceOwnerOption,
  MINIMUM_HOSTED_SERVICE_OWNERS,
} from '../../../../stores/editor/editor-state/element-editor-state/function-activator/HostedServiceFunctionActivatorEditorState.js';
import {
  hostedService_setAutoActivateUpdates,
  hostedService_setDocumentation,
  hostedService_setPattern,
  hostedService_removePatternParameter,
  hostedService_setStoreModel,
  hostedService_setGenerateLineage,
  activator_setDeploymentOwner,
  activator_updateUserOwnership,
  activator_deleteValueFromUserOwnership,
  activator_addUserOwner,
} from '../../../../stores/graph-modifier/DSL_FunctionActivator_GraphModifierHelper.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LEGEND_STUDIO_TEST_ID } from '../../../../__lib__/LegendStudioTesting.js';
import { debounce } from '@finos/legend-shared';
import { flowResult } from 'mobx';

type UserOption = { label: string; value: string };

export const HostedServiceFunctionActivatorEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const editorState = editorStore.tabManagerState.getCurrentEditorState(
    HostedServiceFunctionActivatorEditorState,
  );
  const isReadOnly = editorState.isReadOnly;
  const activator = editorState.activator;
  const ownership = activator.ownership;
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
    if (!isReadOnly) {
      hostedService_setDocumentation(activator, event.target.value);
    }
  };

  const toggleUseStoreModel = (): void => {
    hostedService_setStoreModel(activator, !activator.storeModel);
  };

  const toggleGenerateLineage = (): void => {
    hostedService_setGenerateLineage(activator, !activator.generateLineage);
  };

  const toggleAutoActivateUpdates = (): void => {
    hostedService_setAutoActivateUpdates(
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

  //Ownership
  const [showOwnerEditInput, setShowOwnerEditInput] = useState<
    boolean | number
  >(false);
  const [ownerInputValue, setOwnerInputValue] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [ownerInputs, setOwnerInputs] = useState<string[]>([]);
  const showAddOwnerInput = (): void => setShowOwnerEditInput(true);

  const onOwnershipChange = (
    val: HostedServiceOwnerOption | undefined,
  ): void => {
    if (val) {
      editorState.setSelectedOwnership(val);
    }
  };

  const updateDeploymentIdentifier: React.ChangeEventHandler<
    HTMLInputElement
  > = (event) => {
    if (!isReadOnly && ownership instanceof DeploymentOwner) {
      activator_setDeploymentOwner(ownership, event.target.value);
    }
  };

  const changeUserOwnerInputValue: React.ChangeEventHandler<
    HTMLInputElement
  > = (event) => setOwnerInputValue(event.target.value);

  const updateUser =
    (idx: number): (() => void) =>
    (): void => {
      if (
        ownerInputValue &&
        ownership instanceof UserList &&
        !ownership.users.includes(ownerInputValue)
      ) {
        activator_updateUserOwnership(ownership, ownerInputValue, idx);
      }
    };

  const showEditOwnerInput =
    (value: string, idx: number): (() => void) =>
    (): void => {
      setOwnerInputValue(value);
      setShowOwnerEditInput(idx);
    };

  const hideAddOrEditOwnerInput = (): void => {
    setShowOwnerEditInput(false);
    setOwnerInputValue('');
  };

  const deleteUser =
    (idx: number): (() => void) =>
    (): void => {
      if (!isReadOnly && ownership instanceof UserList) {
        activator_deleteValueFromUserOwnership(ownership, idx);
        if (
          typeof showOwnerEditInput === 'number' &&
          showOwnerEditInput > idx
        ) {
          setShowOwnerEditInput(showOwnerEditInput - 1);
        }
      }
    };

  const debouncedSearchUsers = useMemo(
    () =>
      debounce((input: string): void => {
        setIsLoadingUsers(true);
        flowResult(editorState.searchUsers(input))
          .then((users) =>
            setUserOptions(
              users.map((u) => ({
                value: u.userId,
                label: u.userId,
              })),
            ),
          )
          .then(() => setIsLoadingUsers(false))
          .catch(editorState.editorStore.applicationStore.alertUnhandledError);
      }, 500),
    [editorState],
  );

  const onSearchTextChange = (value: string): void => {
    if (value !== searchText) {
      setSearchText(value);
      debouncedSearchUsers.cancel();
      if (value.length >= 3) {
        debouncedSearchUsers(value);
      } else if (value.length === 0) {
        setUserOptions([]);
        setIsLoadingUsers(false);
      }
    }
  };

  const onUserOptionChange = (options: UserOption[]): void => {
    setOwnerInputs(options.map((op) => op.label));
    setUserOptions([]);
    debouncedSearchUsers.cancel();
    setIsLoadingUsers(false);
  };

  const addUser = (): void => {
    ownerInputs.forEach((value) => {
      if (
        value &&
        ownership instanceof UserList &&
        !ownership.users.includes(value)
      ) {
        activator_addUserOwner(ownership, value);
      }
    });
    hideAddOrEditOwnerInput();
  };

  //Pattern
  const patternRef = useRef<HTMLInputElement>(null);
  const [pattern, setPattern] = useState(activator.pattern);

  const updatePattern = (newPattern: string): void => {
    if (!isReadOnly) {
      hostedService_setPattern(activator, newPattern);
    }
  };

  const removePatternParameter =
    (val: string): (() => void) =>
    (): void => {
      hostedService_removePatternParameter(activator, val);
      setPattern(activator.pattern);
    };

  useEffect(() => {
    patternRef.current?.focus();
  }, [editorState]);

  return (
    <div className="hosted-service-function-activator-editor">
      <Panel>
        <PanelHeader title="Rest Service Application" />
        <PanelLoadingIndicator
          isLoading={Boolean(
            editorState.validateState.isInProgress ||
              editorState.deployState.isInProgress,
          )}
        />
        <PanelContent>
          <div className="hosted-service-function-activator-editor__header">
            <div className="hosted-service-function-activator-editor__header__label">
              Rest Service Activator
            </div>
            <div className="hosted-service-function-activator-editor__header__actions">
              <button
                className="hosted-service-function-activator-editor__header__actions__action hosted-service-function-activator-editor__header__actions__action--primary"
                onClick={validate}
                disabled={editorState.validateState.isInProgress}
                tabIndex={-1}
                title="Click Validate to verify your activator before deployment"
              >
                Validate
              </button>
              <button
                className="hosted-service-function-activator-editor__header__actions__action hosted-service-function-activator-editor__header__actions__action--primary"
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
              isReadOnly={isReadOnly}
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
                          disabled={isReadOnly}
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
            <div className="hosted-service-function-activator-editor__configuration__items">
              <div className="hosted-service-function-activator-editor__configuration__item">
                <div className="btn--sm hosted-service-function-activator-editor__configuration__item__label">
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
                  className="btn--dark btn--sm hosted-service-function-activator-editor__configuration__item__btn"
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
                disabled={isReadOnly}
                value={activator.documentation}
                onChange={changeDocumentation}
              />
            </div>
          </PanelForm>
          <PanelForm>
            <PanelFormBooleanField
              isReadOnly={isReadOnly}
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
              isReadOnly={isReadOnly}
              value={activator.storeModel}
              name="Store Model"
              prompt="Use Store Model (slower)"
              update={toggleUseStoreModel}
            />
          </PanelForm>
          <PanelForm>
            <PanelFormBooleanField
              isReadOnly={isReadOnly}
              value={activator.generateLineage}
              name="Generate Lineage"
              prompt="Generate Lineage (slower)"
              update={toggleGenerateLineage}
            />
          </PanelForm>
          <PanelForm>
            {
              <div>
                <div className="panel__content__form__section">
                  <div className="panel__content__form__section__header__label">
                    Ownership
                  </div>
                  <div className="panel__content__form__section__header__prompt">
                    The ownership model you want to use to control your service.
                  </div>
                  <CustomSelectorInput
                    options={OWNERSHIP_OPTIONS}
                    onChange={onOwnershipChange}
                    value={editorState.selectedOwnership}
                    darkMode={
                      !applicationStore.layoutService
                        .TEMPORARY__isLightColorThemeEnabled
                    }
                  />
                </div>
                {ownership instanceof DeploymentOwner && (
                  <div className="panel__content__form__section">
                    <div>
                      <div className="panel__content__form__section__header__label">
                        Deployment Identifier :
                      </div>
                      <input
                        className="panel__content__form__section__input"
                        spellCheck={false}
                        disabled={isReadOnly}
                        value={ownership.id}
                        onChange={updateDeploymentIdentifier}
                      />
                    </div>
                  </div>
                )}
                {ownership instanceof UserList && (
                  <div className="panel__content__form__section">
                    <div>
                      <div className="panel__content__form__section__header__label">
                        Users :
                      </div>
                      <div className="panel__content__form__section__list">
                        <div
                          className="panel__content__form__section__list__items"
                          data-testid={
                            LEGEND_STUDIO_TEST_ID.PANEL_CONTENT_FORM_SECTION_LIST_ITEMS
                          }
                        >
                          {ownership.users.map((value, idx) => (
                            <div
                              key={value}
                              className={
                                showOwnerEditInput === idx
                                  ? 'panel__content__form__section__list__new-item'
                                  : 'panel__content__form__section__list__item'
                              }
                            >
                              {showOwnerEditInput === idx ? (
                                <>
                                  <input
                                    className="panel__content__form__section__input panel__content__form__section__list__new-item__input"
                                    spellCheck={false}
                                    disabled={isReadOnly}
                                    value={ownerInputValue}
                                    onChange={changeUserOwnerInputValue}
                                  />
                                  <div className="panel__content__form__section__list__new-item__actions">
                                    <button
                                      className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                                      disabled={
                                        isReadOnly ||
                                        ownership.users.includes(
                                          ownerInputValue,
                                        )
                                      }
                                      onClick={updateUser(idx)}
                                      tabIndex={-1}
                                    >
                                      Save
                                    </button>
                                    <button
                                      className="panel__content__form__section__list__new-item__cancel-btn btn btn--dark"
                                      disabled={isReadOnly}
                                      onClick={hideAddOrEditOwnerInput}
                                      tabIndex={-1}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="panel__content__form__section__list__item__value">
                                    {value}
                                  </div>
                                  <div className="panel__content__form__section__list__item__actions">
                                    <button
                                      className="panel__content__form__section__list__item__edit-btn"
                                      disabled={isReadOnly}
                                      onClick={showEditOwnerInput(value, idx)}
                                      tabIndex={-1}
                                    >
                                      <PencilIcon />
                                    </button>
                                    <button
                                      className="panel__content__form__section__list__item__remove-btn"
                                      disabled={isReadOnly}
                                      onClick={deleteUser(idx)}
                                      tabIndex={-1}
                                    >
                                      <TimesIcon />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                          {showOwnerEditInput === true && (
                            <div className="panel__content__form__section__list__new-item">
                              <CustomSelectorInput
                                className="service-editor__owner__selector"
                                placeholder="Enter an owner..."
                                inputValue={searchText}
                                options={userOptions}
                                allowCreating={true}
                                isLoading={isLoadingUsers}
                                disabled={isReadOnly}
                                darkMode={
                                  !applicationStore.layoutService
                                    .TEMPORARY__isLightColorThemeEnabled
                                }
                                onInputChange={onSearchTextChange}
                                onChange={onUserOptionChange}
                                isMulti={true}
                              />
                              <div className="panel__content__form__section__list__new-item__actions">
                                <button
                                  className="panel__content__form__section__list__new-item__add-btn btn btn--dark service-editor__owner__action"
                                  disabled={
                                    isReadOnly ||
                                    ownerInputs.some((i) =>
                                      ownership.users.includes(i),
                                    )
                                  }
                                  onClick={addUser}
                                  tabIndex={-1}
                                >
                                  Save
                                </button>
                                <button
                                  className="panel__content__form__section__list__new-item__cancel-btn btn btn--dark service-editor__owner__action"
                                  disabled={isReadOnly}
                                  onClick={hideAddOrEditOwnerInput}
                                  tabIndex={-1}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        {ownership.users.length <
                          MINIMUM_HOSTED_SERVICE_OWNERS &&
                          showOwnerEditInput !== true && (
                            <div
                              className="service-editor__owner__validation"
                              title={`${MINIMUM_HOSTED_SERVICE_OWNERS} owners required`}
                            >
                              <ErrorIcon />
                              <div className="service-editor__owner__validation-label">
                                Service requires at least{' '}
                                {MINIMUM_HOSTED_SERVICE_OWNERS} owners
                              </div>
                            </div>
                          )}
                        {showOwnerEditInput !== true && (
                          <div className="panel__content__form__section__list__new-item__add">
                            <button
                              className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                              disabled={isReadOnly}
                              onClick={showAddOwnerInput}
                              tabIndex={-1}
                              title="Add owner"
                            >
                              Add Value
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            }
          </PanelForm>
        </PanelContent>
      </Panel>
    </div>
  );
});
