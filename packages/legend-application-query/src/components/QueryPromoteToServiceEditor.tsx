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
  CheckSquareIcon,
  clsx,
  CustomSelectorInput,
  Dialog,
  InputWithInlineValidation,
  PanelLoadingIndicator,
  SquareIcon,
} from '@finos/legend-art';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import type {
  QueryPromoteToServiceState,
  ProjectOption,
} from '../stores/QueryPromoteToServiceState.js';

export const QueryPromoteToServiceEditor = observer(
  (props: { promoteToServiceState: QueryPromoteToServiceState }) => {
    const { promoteToServiceState } = props;
    const editorStore = promoteToServiceState.queryEditorStore;
    const workspaces = promoteToServiceState.workspaces;
    const isInitializing = promoteToServiceState.initializingState.isInProgress;
    // modal
    const showModal = promoteToServiceState.showModal;
    const closeModal = (): void => {
      promoteToServiceState.setOpenModal(false);
    };
    // projects
    const selectedProject = promoteToServiceState.selectedProject;
    const projectOptions = promoteToServiceState.projectOptions;
    const onProjectChange = (val: ProjectOption): void => {
      const value = val.value;
      if (promoteToServiceState.project !== value) {
        flowResult(promoteToServiceState.handleChangeProject(value)).catch(
          editorStore.applicationStore.alertUnhandledError,
        );
      }
    };
    const projectPlaceHolder = isInitializing
      ? 'Projects loading'
      : 'Choose a project';

    // workspace
    const workspaceName = promoteToServiceState.workspaceName;
    const changeWorkspaceName: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      promoteToServiceState.setWorkspaceName(event.target.value);
    };
    const workspaceValidationMessage =
      workspaceName === ''
        ? 'Workspace Name Required'
        : workspaces.map((e) => e.workspaceId).includes(workspaceName)
        ? 'Workspace already exists'
        : undefined;
    // service
    const servicePattern = promoteToServiceState.servicePattern;
    const changeServicePattern: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      promoteToServiceState.setServicePattern(event.target.value);
    };
    const servicePatternValidationMessage =
      servicePattern === ''
        ? 'Service pattern required'
        : !servicePattern.startsWith('/')
        ? 'Service Pattern should start with /'
        : undefined;
    const defaultServiceName = `service::MyService`;
    const [servicePath, setServicePath] = useState<string>(defaultServiceName);
    const servicePathValidationMessage =
      servicePath === ''
        ? 'Service path required'
        : !servicePath.includes('::')
        ? 'Service path must include a package'
        : undefined;
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      promoteToServiceState.setCommitCommand(undefined);
      setServicePath(event.target.value);
    };
    const promoteQueryToService = (): void => {
      flowResult(
        promoteToServiceState.promoteQueryToService(servicePath),
      ).catch(editorStore.applicationStore.alertUnhandledError);
    };
    const toggleProjectSetupComplete = (): void => {
      promoteToServiceState.handleProjectSetupComplete(
        !promoteToServiceState.projectSetupComplete,
      );
    };
    const promoteIsDisabled = Boolean(
      workspaceValidationMessage ??
        servicePathValidationMessage ??
        servicePatternValidationMessage ??
        !promoteToServiceState.project,
    );
    return (
      <Dialog open={showModal} onClose={closeModal}>
        <div className="modal modal--dark query-productionize-modal">
          <div className="modal__header">
            <div className="modal__title">Promote Query to Service</div>
          </div>
          <PanelLoadingIndicator
            isLoading={
              promoteToServiceState.promotingToServiceState.isInProgress ||
              promoteToServiceState.initializingState.isInProgress
            }
          />
          <div className="modal__body">
            {promoteToServiceState.promotingToServiceState.isInProgress &&
              promoteToServiceState.promotingToServiceState.message && (
                <div className="service-registration-editor__progress-msg">
                  {`${promoteToServiceState.promotingToServiceState.message}...`}
                </div>
              )}
            <div>
              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label">
                  Project
                </div>
                <div className="panel__content__form__section__header__prompt">
                  Associated project where your service will be saved
                </div>
                <div>
                  <CustomSelectorInput
                    className="binding-general-editor__section__dropdown"
                    options={projectOptions}
                    onChange={onProjectChange}
                    value={selectedProject}
                    darkMode={true}
                    isLoading={isInitializing}
                    placeholder={projectPlaceHolder}
                  />
                </div>
              </div>
              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label">
                  Workspace Name
                </div>
                <div className="panel__content__form__section__header__prompt">
                  Group workspace that will be created for editing of your
                  service
                </div>
                <div className="query-builder__parameters__parameter__name">
                  <InputWithInlineValidation
                    className="query-builder__parameters__parameter__name__input input-group__input"
                    spellCheck={false}
                    value={workspaceName}
                    onChange={changeWorkspaceName}
                    placeholder={`Group Workspace name`}
                    validationErrorMessage={workspaceValidationMessage}
                  />
                </div>
              </div>
              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label">
                  Project Setup Complete
                </div>
                <div
                  className="panel__content__form__section__toggler"
                  onClick={toggleProjectSetupComplete}
                >
                  <button
                    type="button"
                    className={clsx(
                      'panel__content__form__section__toggler__btn',
                      {
                        'panel__content__form__section__toggler__btn--toggled':
                          promoteToServiceState.projectSetupComplete,
                      },
                    )}
                    tabIndex={-1}
                  >
                    {promoteToServiceState.projectSetupComplete ? (
                      <CheckSquareIcon />
                    ) : (
                      <SquareIcon />
                    )}
                  </button>
                  <div className="panel__content__form__section__toggler__prompt">
                    Project contains required metadata for service including
                    dependencies and required elements (models, mapping, runtime
                    etc). Only required change is adding service.
                  </div>
                </div>
              </div>
              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label">
                  Service Path
                </div>
                <div className="panel__content__form__section__header__prompt">
                  Full service path
                </div>
                <div className="query-builder__parameters__parameter__name">
                  <InputWithInlineValidation
                    className="query-builder__parameters__parameter__name__input input-group__input"
                    value={servicePath}
                    onChange={changeValue}
                    placeholder={`Service Path`}
                    validationErrorMessage={servicePathValidationMessage}
                  />
                </div>
              </div>

              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label">
                  Service Pattern
                </div>
                <div className="panel__content__form__section__header__prompt"></div>
                <div className="query-builder__parameters__parameter__name">
                  <InputWithInlineValidation
                    className="query-builder__parameters__parameter__name__input input-group__input"
                    value={servicePattern}
                    onChange={changeServicePattern}
                    placeholder={`Service Pttern`}
                    validationErrorMessage={servicePatternValidationMessage}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="modal__footer">
            <button
              className="modal--simple__btn btn btn--dark btn--primary"
              color="primary"
              disabled={promoteIsDisabled}
              onClick={promoteQueryToService}
            >
              Promote
            </button>
          </div>
        </div>
      </Dialog>
    );
  },
);
