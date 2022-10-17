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

import { useState, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import {
  clsx,
  Dialog,
  SquareIcon,
  PanelLoadingIndicator,
  CheckSquareIcon,
} from '@finos/legend-art';
import { flowResult } from 'mobx';
import { type Project, WorkspaceType } from '@finos/legend-server-sdlc';
import {
  useApplicationStore,
  DocumentationLink,
} from '@finos/legend-application';
import { LEGEND_STUDIO_DOCUMENTATION_KEY } from '../../stores/LegendStudioDocumentation.js';
import { useWorkspaceSetupStore } from './WorkspaceSetup.js';

export const CreateWorkspaceModal = observer(
  (props: { selectedProject: Project }) => {
    const { selectedProject } = props;
    const setupStore = useWorkspaceSetupStore();
    const applicationStore = useApplicationStore();
    const workspaceNameInputRef = useRef<HTMLInputElement>(null);
    const [workspaceName, setWorkspaceName] = useState('');
    const [isGroupWorkspace, setIsGroupWorkspace] = useState<boolean>(true);

    const workspaceAlreadyExists = Boolean(
      setupStore.workspaces.find(
        (workspace) =>
          workspace.workspaceId === workspaceName &&
          ((workspace.workspaceType === WorkspaceType.GROUP &&
            isGroupWorkspace) ||
            (workspace.workspaceType === WorkspaceType.USER &&
              !isGroupWorkspace)),
      ),
    );
    const createWorkspace = (): void => {
      if (workspaceName) {
        flowResult(
          setupStore.createWorkspace(
            selectedProject.projectId,
            workspaceName,
            isGroupWorkspace ? WorkspaceType.GROUP : WorkspaceType.USER,
          ),
        ).catch(applicationStore.alertUnhandledError);
      }
    };
    const changeWorkspaceName: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => setWorkspaceName(event.target.value);
    const toggleGroupWorkspace = (
      event: React.FormEvent<HTMLButtonElement>,
    ): void => {
      event.preventDefault();
      setIsGroupWorkspace(!isGroupWorkspace);
    };

    const handleEnter = (): void => {
      workspaceNameInputRef.current?.focus();
    };
    const onClose = (): void => {
      setupStore.setShowCreateWorkspaceModal(false);
    };

    return (
      <Dialog
        open={setupStore.showCreateWorkspaceModal}
        onClose={onClose}
        TransitionProps={{
          onEnter: handleEnter,
        }}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <div className="modal modal--dark workspace-setup__create-workspace-modal">
          <div className="modal__title">
            Create Workspace
            <DocumentationLink
              className="workspace-setup__create-workspace-modal__doc__create-workspace"
              documentationKey={
                LEGEND_STUDIO_DOCUMENTATION_KEY.CREATE_WORKSPACE
              }
            />
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              createWorkspace();
            }}
          >
            <PanelLoadingIndicator
              isLoading={setupStore.createWorkspaceState.isInProgress}
            />
            <div className="panel__content__form workspace-setup__create-workspace-modal__form workspace-setup__create-workspace-modal__form__workspace">
              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label">
                  Workspace Name
                </div>

                <div className="input-group">
                  <input
                    className="input input--dark input-group__input workspace-setup__create-workspace-modal__form__workspace-name__input"
                    ref={workspaceNameInputRef}
                    spellCheck={false}
                    disabled={
                      setupStore.createWorkspaceState.isInProgress ||
                      setupStore.createOrImportProjectState.isInProgress
                    }
                    placeholder="MyWorkspace"
                    value={workspaceName}
                    onChange={changeWorkspaceName}
                  />
                  {workspaceAlreadyExists && (
                    <div className="input-group__error-message">
                      Workspace with same name already exists
                    </div>
                  )}
                </div>
              </div>
              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label">
                  Group Workspace
                </div>
                <div className="panel__content__form__section__toggler">
                  <button
                    onClick={toggleGroupWorkspace}
                    type="button" // prevent this toggler being activated on form submission
                    className={clsx(
                      'panel__content__form__section__toggler__btn',
                      {
                        'panel__content__form__section__toggler__btn--toggled':
                          isGroupWorkspace,
                      },
                    )}
                    tabIndex={-1}
                  >
                    {isGroupWorkspace ? <CheckSquareIcon /> : <SquareIcon />}
                  </button>
                  <div className="panel__content__form__section__toggler__prompt">
                    Group workspaces can be accessed by all users in the project
                  </div>
                </div>
              </div>
            </div>
            <div className="panel__content__form__actions">
              <button
                disabled={
                  setupStore.createWorkspaceState.isInProgress ||
                  setupStore.createOrImportProjectState.isInProgress ||
                  !workspaceName
                }
                className="btn btn--dark"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      </Dialog>
    );
  },
);
