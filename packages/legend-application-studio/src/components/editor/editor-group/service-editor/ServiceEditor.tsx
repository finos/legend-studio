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

import { useState, useRef, useEffect, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import {
  MINIMUM_SERVICE_OWNERS,
  ServiceEditorState,
  SERVICE_TAB,
  OWNERSHIP_OPTIONS,
  type ServiceOwnerOption,
} from '../../../../stores/editor/editor-state/element-editor-state/service/ServiceEditorState.js';
import {
  clsx,
  PencilIcon,
  LockIcon,
  TimesIcon,
  ErrorIcon,
  PanelFormBooleanField,
  PanelForm,
  CustomSelectorInput,
  PanelFormValidatedTextField,
  PanelContentLists,
} from '@finos/legend-art';
import { debounce, prettyCONSTName } from '@finos/legend-shared';
import { ServiceExecutionEditor } from './ServiceExecutionEditor.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../__lib__/LegendStudioTesting.js';
import { ServiceRegistrationEditor } from './ServiceRegistrationEditor.js';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  service_addOwner,
  service_deleteOwner,
  service_removePatternParameter,
  service_setAutoActivateUpdates,
  service_setDocumentation,
  service_setPattern,
  service_updateOwner,
  service_deploymentOwnership,
  service_addUserOwnership,
  service_updateUserOwnership,
  service_deleteValueFromUserOwnership,
} from '../../../../stores/graph-modifier/DSL_Service_GraphModifierHelper.js';
import {
  useApplicationNavigationContext,
  useApplicationStore,
} from '@finos/legend-application';
import {
  validate_ServicePattern,
  DeploymentOwnership,
  UserListOwnership,
} from '@finos/legend-graph';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../__lib__/LegendStudioApplicationNavigationContext.js';
import { ServiceTestableEditor } from './testable/ServiceTestableEditor.js';
import { flowResult } from 'mobx';
import { LEGEND_STUDIO_DOCUMENTATION_KEY } from '../../../../__lib__/LegendStudioDocumentation.js';
import { DocumentationLink } from '@finos/legend-lego/application';
import { ServicePostValidationsEditor } from './ServicePostValidationEditor.js';

type UserOption = { label: string; value: string };

const ServiceGeneralEditor = observer(() => {
  const editorStore = useEditorStore();
  const serviceState =
    editorStore.tabManagerState.getCurrentEditorState(ServiceEditorState);
  const service = serviceState.service;
  const ownership = service.ownership;
  const isReadOnly = serviceState.isReadOnly;
  // Pattern
  const patternRef = useRef<HTMLInputElement>(null);
  const [pattern, setPattern] = useState(service.pattern);

  const updatePattern = (newPattern: string): void => {
    if (!isReadOnly) {
      service_setPattern(service, newPattern);
    }
  };
  const getValidationMessage = (inputPattern: string): string | undefined => {
    const patternValidationResult = validate_ServicePattern(inputPattern);
    return patternValidationResult
      ? patternValidationResult.messages[0]
      : undefined;
  };
  const removePatternParameter =
    (val: string): (() => void) =>
    (): void => {
      service_removePatternParameter(service, val);
      setPattern(service.pattern);
    };
  // Owners
  const owners = service.owners;
  const [showOwnerEditInput, setShowOwnerEditInput] = useState<
    boolean | number
  >(false);
  const applicationStore = useApplicationStore();
  const [ownerInputValue, setOwnerInputValue] = useState<string>('');
  const [ownerInputs, setOwnerInputs] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const showAddOwnerInput = (): void => setShowOwnerEditInput(true);
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
  const changeOwnerInputValue: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => setOwnerInputValue(event.target.value);
  const addOwner = (): void => {
    ownerInputs.forEach((value) => {
      if (value && !isReadOnly && !owners.includes(value)) {
        service_addOwner(service, value);
      }
    });
    hideAddOrEditOwnerInput();
  };
  const updateOwner =
    (idx: number): (() => void) =>
    (): void => {
      if (ownerInputValue && !isReadOnly && !owners.includes(ownerInputValue)) {
        service_updateOwner(service, ownerInputValue, idx);
      }
    };
  const deleteOwner =
    (idx: number): (() => void) =>
    (): void => {
      if (!isReadOnly) {
        service_deleteOwner(service, idx);
        // Since we keep track of the value currently being edited using the index, we have to account for it as we delete entry
        if (
          typeof showOwnerEditInput === 'number' &&
          showOwnerEditInput > idx
        ) {
          setShowOwnerEditInput(showOwnerEditInput - 1);
        }
      }
    };

  const changeUserOwnerInputValue: React.ChangeEventHandler<
    HTMLInputElement
  > = (event) => setOwnerInputValue(event.target.value);

  const updateDeploymentIdentifier: React.ChangeEventHandler<
    HTMLInputElement
  > = (event) => {
    if (!isReadOnly && ownership instanceof DeploymentOwnership) {
      service_deploymentOwnership(ownership, event.target.value);
    }
  };

  const addUser = (): void => {
    ownerInputs.forEach((value) => {
      if (
        value &&
        !isReadOnly &&
        ownership instanceof UserListOwnership &&
        !ownership.users.includes(value)
      ) {
        service_addUserOwnership(ownership, value);
      }
    });
    hideAddOrEditOwnerInput();
  };

  const updateUser =
    (idx: number): (() => void) =>
    (): void => {
      if (
        ownerInputValue &&
        !isReadOnly &&
        ownership instanceof UserListOwnership &&
        !ownership.users.includes(ownerInputValue)
      ) {
        service_updateUserOwnership(ownership, ownerInputValue, idx);
      }
    };

  const deleteUser =
    (idx: number): (() => void) =>
    (): void => {
      if (!isReadOnly && ownership instanceof UserListOwnership) {
        service_deleteValueFromUserOwnership(ownership, idx);
        // Since we keep track of the value currently being edited using the index, we have to account for it as we delete entry
        if (
          typeof showOwnerEditInput === 'number' &&
          showOwnerEditInput > idx
        ) {
          setShowOwnerEditInput(showOwnerEditInput - 1);
        }
      }
    };

  // Other
  const changeDocumentation: React.ChangeEventHandler<HTMLTextAreaElement> = (
    event,
  ) => {
    if (!isReadOnly) {
      service_setDocumentation(service, event.target.value);
    }
  };
  const toggleAutoActivateUpdates = (): void => {
    service_setAutoActivateUpdates(service, !service.autoActivateUpdates);
  };

  const debouncedSearchUsers = useMemo(
    () =>
      debounce((input: string): void => {
        setIsLoadingUsers(true);
        flowResult(serviceState.searchUsers(input))
          .then((users) =>
            setUserOptions(
              users.map((u) => ({
                value: u.userId,
                label: u.userId,
              })),
            ),
          )
          .then(() => setIsLoadingUsers(false))
          .catch(serviceState.editorStore.applicationStore.alertUnhandledError);
      }, 500),
    [serviceState],
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

  const onOwnershipChange = (val: ServiceOwnerOption | undefined): void => {
    if (val) {
      serviceState.setSelectedOwnership(val);
    }
  };

  useEffect(() => {
    patternRef.current?.focus();
  }, [serviceState]);

  return (
    <PanelContentLists className="service-editor__general">
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
            {!service.patternParameters.length && (
              <div className="service-editor__parameters__list__empty">
                No parameter
              </div>
            )}
            {Boolean(service.patternParameters.length) &&
              service.patternParameters.map((parameter) => (
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
      {/* TODO: potentially we can have a button to go to the service */}
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
            value={service.documentation}
            onChange={changeDocumentation}
          />
        </div>
      </PanelForm>
      <PanelForm>
        <PanelFormBooleanField
          isReadOnly={isReadOnly}
          value={service.autoActivateUpdates}
          name="Auto Activate Updates"
          prompt="Specifies if the new generation should be automatically activated;
        only valid when latest revision is selected upon service
        registration"
          update={toggleAutoActivateUpdates}
        />
      </PanelForm>
      <PanelForm>
        {owners.length === 0 && (
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
                value={serviceState.selectedOwnership}
                darkMode={
                  !applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled
                }
              />
            </div>
            {ownership instanceof DeploymentOwnership && (
              <div className="panel__content__form__section">
                <div>
                  <div className="panel__content__form__section__header__label">
                    Deployment Identifier :
                  </div>
                  <input
                    className="panel__content__form__section__input"
                    spellCheck={false}
                    disabled={isReadOnly}
                    value={ownership.identifier}
                    onChange={updateDeploymentIdentifier}
                  />
                </div>
              </div>
            )}
            {ownership instanceof UserListOwnership && (
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
                                    ownership.users.includes(ownerInputValue)
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
                    {ownership.users.length < MINIMUM_SERVICE_OWNERS &&
                      showOwnerEditInput !== true && (
                        <div
                          className="service-editor__owner__validation"
                          title={`${MINIMUM_SERVICE_OWNERS} owners required`}
                        >
                          <ErrorIcon />
                          <div className="service-editor__owner__validation-label">
                            Service requires at least {MINIMUM_SERVICE_OWNERS}{' '}
                            owners
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
        )}
        {owners.length > 0 && (
          <div className="panel__content__form__section">
            <div className="panel__content__form__section__header__label">
              Owners (deprecated)
            </div>
            <div className="panel__content__form__section__header__prompt">
              {`Specifies who can manage and operate the service (requires minimum ${MINIMUM_SERVICE_OWNERS}
          owners).`}
            </div>
            <div className="panel__content__form__section__list">
              <div
                className="panel__content__form__section__list__items"
                data-testid={
                  LEGEND_STUDIO_TEST_ID.PANEL_CONTENT_FORM_SECTION_LIST_ITEMS
                }
              >
                {owners.map((value, idx) => (
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
                          onChange={changeOwnerInputValue}
                        />
                        <div className="panel__content__form__section__list__new-item__actions">
                          <button
                            className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                            disabled={
                              isReadOnly || owners.includes(ownerInputValue)
                            }
                            onClick={updateOwner(idx)}
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
                            onClick={deleteOwner(idx)}
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
                          ownerInputs.some((i) => owners.includes(i))
                        }
                        onClick={addOwner}
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
              {owners.length < MINIMUM_SERVICE_OWNERS &&
                showOwnerEditInput !== true && (
                  <div
                    className="service-editor__owner__validation"
                    title={`${MINIMUM_SERVICE_OWNERS} owners required`}
                  >
                    <ErrorIcon />
                    <div className="service-editor__owner__validation-label">
                      Service requires at least {MINIMUM_SERVICE_OWNERS} owners
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
        )}
      </PanelForm>
    </PanelContentLists>
  );
});

export const ServiceEditor = observer(() => {
  const editorStore = useEditorStore();
  const serviceState =
    editorStore.tabManagerState.getCurrentEditorState(ServiceEditorState);
  const service = serviceState.service;
  const isReadOnly = serviceState.isReadOnly;
  const selectedTab = serviceState.selectedTab;
  const changeTab =
    (tab: SERVICE_TAB): (() => void) =>
    (): void =>
      serviceState.setSelectedTab(tab);
  useApplicationNavigationContext(
    LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.SERVICE_EDITOR,
  );
  const renderServiceEditorTab = (): React.ReactNode => {
    switch (selectedTab) {
      case SERVICE_TAB.GENERAL:
        return <ServiceGeneralEditor />;
      case SERVICE_TAB.EXECUTION:
        return <ServiceExecutionEditor />;
      case SERVICE_TAB.REGISTRATION:
        return <ServiceRegistrationEditor />;
      case SERVICE_TAB.TEST:
        return (
          <ServiceTestableEditor
            serviceTestableState={serviceState.testableState}
          />
        );
      case SERVICE_TAB.POST_VALIDATION:
        return (
          <ServicePostValidationsEditor
            validationState={serviceState.postValidationState}
          />
        );
      default:
        return null;
    }
  };

  const renderTabDocLInk = (tab: SERVICE_TAB): React.ReactNode => {
    let doc: LEGEND_STUDIO_DOCUMENTATION_KEY | null = null;
    switch (tab) {
      case SERVICE_TAB.TEST:
        doc =
          LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_HOW_TO_WRITE_A_SERVICE_TEST;
        break;
      case SERVICE_TAB.POST_VALIDATION:
        doc =
          LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_HOW_TO_WRITE_A_SERVICE_POST_VALIDATION;
        break;
      default:
        break;
    }
    return doc ? <DocumentationLink documentationKey={doc} /> : null;
  };

  return (
    <div className="service-editor">
      <div className="panel">
        <div className="panel__header">
          <div className="panel__header__title">
            {isReadOnly && (
              <div className="uml-element-editor__header__lock">
                <LockIcon />
              </div>
            )}
            <div className="panel__header__title__label">service</div>
            <div className="panel__header__title__content">{service.name}</div>
          </div>
        </div>
        <div className="panel__header service-editor__header--with-tabs">
          <div className="uml-element-editor__tabs">
            {Object.values(SERVICE_TAB)
              .filter((tab) => {
                if (tab === SERVICE_TAB.REGISTRATION) {
                  return Boolean(
                    editorStore.applicationStore.config.options
                      .TEMPORARY__serviceRegistrationConfig.length,
                  );
                }
                return true;
              })
              .map((tab) => (
                <div
                  key={tab}
                  onClick={changeTab(tab)}
                  className={clsx('service-editor__tab', {
                    'service-editor__tab--active': tab === selectedTab,
                  })}
                >
                  {prettyCONSTName(tab)}
                  {renderTabDocLInk(tab)}
                </div>
              ))}
          </div>
        </div>
        <div className="panel__content service-editor__content">
          {renderServiceEditorTab()}
        </div>
      </div>
    </div>
  );
});
