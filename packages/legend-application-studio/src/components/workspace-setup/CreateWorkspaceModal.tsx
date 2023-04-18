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
  Dialog,
  PanelLoadingIndicator,
  Modal,
  PanelFormActions,
  PanelFormTextField,
  PanelDivider,
  PanelForm,
  PanelFormBooleanField,
} from '@finos/legend-art';
import { flowResult } from 'mobx';
import { type Project, WorkspaceType } from '@finos/legend-server-sdlc';
import { useApplicationStore } from '@finos/legend-application';
import { LEGEND_STUDIO_DOCUMENTATION_KEY } from '../../application/LegendStudioDocumentation.js';
import { useWorkspaceSetupStore } from './WorkspaceSetup.js';
import { DocumentationLink } from '@finos/legend-lego/application';

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
      if (
        workspaceName &&
        setupStore.currentProjectConfigurationStatus?.isConfigured
      ) {
        flowResult(
          setupStore.createWorkspace(
            selectedProject.projectId,
            workspaceName,
            isGroupWorkspace ? WorkspaceType.GROUP : WorkspaceType.USER,
          ),
        ).catch(applicationStore.alertUnhandledError);
      }
    };
    const toggleGroupWorkspace = (): void => {
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
        <Modal
          darkMode={true}
          className="workspace-setup__create-workspace-modal"
        >
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
            <PanelForm className="workspace-setup__create-workspace-modal__form workspace-setup__create-workspace-modal__form__workspace">
              <PanelDivider />
              <PanelFormTextField
                ref={workspaceNameInputRef}
                name="Workspace Name"
                isReadOnly={
                  setupStore.createWorkspaceState.isInProgress ||
                  setupStore.createOrImportProjectState.isInProgress
                }
                placeholder="MyWorkspace"
                fullWidth={true}
                className="workspace-setup__create-workspace-modal__form__workspace-name__input"
                value={workspaceName}
                update={(val: string | undefined) =>
                  setWorkspaceName(val ?? '')
                }
                errorMessage={
                  workspaceAlreadyExists
                    ? 'Workspace with same name already exists '
                    : ''
                }
              />

              <PanelFormBooleanField
                name="Group Workspace"
                prompt="Group workspaces can be accessed by all users in the project"
                value={isGroupWorkspace}
                isReadOnly={false}
                update={toggleGroupWorkspace}
              />
            </PanelForm>
            <PanelFormActions>
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
            </PanelFormActions>
          </form>
        </Modal>
      </Dialog>
    );
  },
);
