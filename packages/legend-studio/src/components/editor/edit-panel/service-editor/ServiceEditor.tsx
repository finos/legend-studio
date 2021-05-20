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

import { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '../../../../stores/EditorStore';
import { observer } from 'mobx-react-lite';
import {
  FaLock,
  FaCheckSquare,
  FaSquare,
  FaTimes,
  FaInfoCircle,
  FaSave,
  FaRocket,
} from 'react-icons/fa';
import {
  ServiceEditorState,
  SERVICE_TAB,
} from '../../../../stores/editor-state/element-editor-state/service/ServiceEditorState';
import { clsx } from '@finos/legend-studio-components';
import { MdModeEdit } from 'react-icons/md';
import { prettyCONSTName } from '@finos/legend-studio-shared';
import { ServiceExecutionEditor } from './ServiceExecutionEditor';
import { CORE_TEST_ID } from '../../../../const';
import { ServiceRegistrationModalEditor } from '../../../editor/edit-panel/service-editor/ServiceRegistrationModalEditor';
import { validateServicePattern } from '../../../../models/metamodels/pure/model/packageableElements/service/Service';
import { useApplicationStore } from '../../../../stores/ApplicationStore';

const ServiceGeneralEditor = observer(() => {
  const editorStore = useEditorStore();
  const serviceState = editorStore.getCurrentEditorState(ServiceEditorState);
  const service = serviceState.service;
  const isReadOnly = serviceState.isReadOnly;
  // Pattern
  const patternRef = useRef<HTMLInputElement>(null);
  const [pattern, setPattern] = useState(service.pattern);
  const changePattern: React.ChangeEventHandler<HTMLInputElement> = (event) =>
    setPattern(event.target.value);
  const updatePattern = (): void => {
    if (!isReadOnly) {
      service.setPattern(pattern);
    }
  };
  const patternValidationResult = validateServicePattern(pattern);
  const allowUpdatingPattern =
    !patternValidationResult.messages.length && pattern !== service.pattern;
  const removePatternParameter =
    (val: string): (() => void) =>
    (): void => {
      service.removePatternParameter(val);
      setPattern(service.pattern);
    };
  // Owners
  const owners = service.owners;
  const [showOwnerEditInput, setShowOwnerEditInput] =
    useState<boolean | number>(false);
  const [ownerInputValue, setOwnerInputValue] = useState<string>('');
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
    if (ownerInputValue && !isReadOnly && !owners.includes(ownerInputValue)) {
      service.addOwner(ownerInputValue);
    }
    hideAddOrEditOwnerInput();
  };
  const updateOwner =
    (idx: number): (() => void) =>
    (): void => {
      if (ownerInputValue && !isReadOnly && !owners.includes(ownerInputValue)) {
        service.updateOwner(ownerInputValue, idx);
      }
    };
  const deleteOwner =
    (idx: number): (() => void) =>
    (): void => {
      if (!isReadOnly) {
        service.deleteOwner(idx);
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
      service.setDocumentation(event.target.value);
    }
  };
  const toggleAutoActivateUpdates = (): void => {
    service.setAutoActivateUpdates(!service.autoActivateUpdates);
  };

  useEffect(() => {
    patternRef.current?.focus();
  }, [serviceState]);

  return (
    <div className="panel__content__lists service-editor__general">
      <div className="panel__content__form">
        <div className="panel__content__form__section service-editor__pattern">
          <div className="panel__content__form__section__header__label">
            URL Pattern
          </div>
          <div className="panel__content__form__section__header__prompt">
            Specifies the URL pattern of the service (e.g. /myService/
            <span className="service-editor__pattern__example__param">{`{param}`}</span>
            )
          </div>
          <div className="input-group service-editor__pattern__edit">
            <div className="input-group service-editor__pattern__input__group">
              <input
                ref={patternRef}
                className="input-group__input panel__content__form__section__input service-editor__pattern__input"
                spellCheck={false}
                disabled={isReadOnly}
                value={pattern}
                onChange={changePattern}
              />
              {Boolean(patternValidationResult.messages.length) && (
                <div className="input-group__error-message">
                  {patternValidationResult.messages.map((error) => (
                    <div
                      key={error}
                      className="input-group__error-message__item"
                    >
                      {error}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              className="service-editor__pattern__input__save-btn btn--dark"
              tabIndex={-1}
              disabled={isReadOnly || !allowUpdatingPattern}
              onClick={updatePattern}
              title="Save change"
            >
              <FaSave />
            </button>
          </div>
        </div>
      </div>
      <div className="service-editor__pattern__parameters">
        <div className="service-editor__pattern__parameters__header">
          <div className="service-editor__pattern__parameters__header__label">
            Parameters
          </div>
          <div
            className="service-editor__pattern__parameters__header__info"
            title={`URL parameters (each must be surrounded by curly braces) will be passed as arguments for the execution query.\nNote that if the service is configured to use multi-execution, one of the URL parameters must be chosen as the execution key.`}
          >
            <FaInfoCircle />
          </div>
        </div>
        <div className="service-editor__pattern__parameters__list">
          {!service.patternParameters.length && (
            <div className="service-editor__pattern__parameters__list__empty">
              No parameter
            </div>
          )}
          {Boolean(service.patternParameters.length) &&
            service.patternParameters.map((parameter) => (
              <div
                key={parameter}
                className="service-editor__pattern__parameter"
              >
                <div className="service-editor__pattern__parameter__text">
                  {parameter}
                </div>
                <div className="service-editor__pattern__parameter__actions">
                  <button
                    className="service-editor__pattern__parameter__action"
                    disabled={isReadOnly}
                    onClick={removePatternParameter(parameter)}
                    title={'Remove parameter'}
                    tabIndex={-1}
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
      {/* TODO: potentially we can have a button to go to the service */}
      <div className="panel__content__form">
        <div className="panel__content__form__section">
          <div className="panel__content__form__section__header__label">
            Documentation
          </div>
          <div className="panel__content__form__section__header__prompt">{`Provides a brief description of the service's functionalities and usage`}</div>
          <textarea
            className="panel__content__form__section__textarea service-editor__documentation__input"
            spellCheck={false}
            disabled={isReadOnly}
            value={service.documentation}
            onChange={changeDocumentation}
          />
        </div>
      </div>
      <div className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          Auto Activate Updates
        </div>
        <div
          className={clsx('panel__content__form__section__toggler', {
            'panel__content__form__section__toggler--disabled': isReadOnly,
          })}
          onClick={toggleAutoActivateUpdates}
        >
          <button
            className={clsx('panel__content__form__section__toggler__btn', {
              'panel__content__form__section__toggler__btn--toggled':
                service.autoActivateUpdates,
            })}
            disabled={isReadOnly}
            tabIndex={-1}
          >
            {service.autoActivateUpdates ? <FaCheckSquare /> : <FaSquare />}
          </button>
          <div className="panel__content__form__section__toggler__prompt">
            Specifies if the new generation should be automatically activated;
            only valid when latest revision is selected upon service
            registration
          </div>
        </div>
      </div>
      <div className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          Owners
        </div>
        <div className="panel__content__form__section__header__prompt">
          Specifies who can manage and operate the service
        </div>
        <div className="panel__content__form__section__list">
          <div
            className="panel__content__form__section__list__items"
            data-testid={CORE_TEST_ID.PANEL_CONTENT_FORM_SECTION_LIST_ITEMS}
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
                        <MdModeEdit />
                      </button>
                      <button
                        className="panel__content__form__section__list__item__remove-btn"
                        disabled={isReadOnly}
                        onClick={deleteOwner(idx)}
                        tabIndex={-1}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {showOwnerEditInput === true && (
              <div className="panel__content__form__section__list__new-item">
                <input
                  className="panel__content__form__section__input panel__content__form__section__list__new-item__input"
                  spellCheck={false}
                  disabled={isReadOnly}
                  value={ownerInputValue}
                  onChange={changeOwnerInputValue}
                  placeholder="Enter an owner..."
                />
                <div className="panel__content__form__section__list__new-item__actions">
                  <button
                    className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                    disabled={isReadOnly || owners.includes(ownerInputValue)}
                    onClick={addOwner}
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
              </div>
            )}
          </div>
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
  );
});

export const ServiceEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const serviceState = editorStore.getCurrentEditorState(ServiceEditorState);
  const service = serviceState.service;
  const isReadOnly = serviceState.isReadOnly;
  // Tab
  const selectedTab = serviceState.selectedTab;
  const changeTab =
    (tab: SERVICE_TAB): (() => void) =>
    (): void =>
      serviceState.setSelectedTab(tab);
  // actions
  const serviceModal = (): void => serviceState.registrationState.openModal();

  return (
    <div className="service-editor">
      <div className="panel">
        <div className="panel__header">
          <div className="panel__header__title">
            {isReadOnly && (
              <div className="uml-element-editor__header__lock">
                <FaLock />
              </div>
            )}
            <div className="panel__header__title__label">service</div>
            <div className="panel__header__title__content">{service.name}</div>
          </div>
          {!applicationStore.config.options
            .TEMPORARY__disableServiceRegistration && (
            <div className="panel__header__actions">
              <button
                className="panel__header__action"
                disabled={
                  serviceState.registrationState.registeringState.isInProgress
                }
                tabIndex={-1}
                onClick={serviceModal}
                title={'Register service...'}
              >
                <FaRocket />
              </button>
            </div>
          )}
        </div>
        <div className="panel__header service-editor__header--with-tabs">
          <div className="uml-element-editor__tabs">
            {Object.values(SERVICE_TAB).map((tab) => (
              <div
                key={tab}
                onClick={changeTab(tab)}
                className={clsx('service-editor__tab', {
                  'service-editor__tab--active': tab === selectedTab,
                })}
              >
                {prettyCONSTName(tab)}
              </div>
            ))}
          </div>
        </div>
        <div className="panel__content service-editor__content">
          {selectedTab === SERVICE_TAB.GENERAL && <ServiceGeneralEditor />}
          {selectedTab === SERVICE_TAB.EXECUTION && <ServiceExecutionEditor />}
          {serviceState.registrationState.modal && (
            <ServiceRegistrationModalEditor />
          )}
        </div>
      </div>
    </div>
  );
});
