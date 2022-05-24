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

import { useState, useEffect, useRef } from 'react';
import { ProjectSelector } from './ProjectSelector';
import { WorkspaceSelector } from './WorkspaceSelector';
import { observer } from 'mobx-react-lite';
import {
  type SelectComponent,
  clsx,
  Dialog,
  SquareIcon,
  compareLabelFn,
  CustomSelectorInput,
  PanelLoadingIndicator,
  CheckSquareIcon,
  MarkdownTextViewer,
} from '@finos/legend-art';
import type { ProjectOption } from '../../stores/SetupStore';
import { SetupStoreProvider, useSetupStore } from './SetupStoreProvider';
import { useParams } from 'react-router';
import { LEGEND_STUDIO_TEST_ID } from '../LegendStudioTestID';
import {
  type SetupPathParams,
  generateEditorRoute,
} from '../../stores/LegendStudioRouter';
import { flowResult } from 'mobx';
import { WorkspaceType } from '@finos/legend-server-sdlc';
import {
  useApplicationStore,
  DocumentationLink,
} from '@finos/legend-application';
import type { LegendStudioConfig } from '../../application/LegendStudioConfig';
import { LEGEND_STUDIO_DOCUMENTATION_KEY } from '../../stores/LegendStudioDocumentation';
import { CreateProjectModal } from './ProjectCreateModal';
import { ActivityBarMenu } from '../editor/ActivityBar';

const CreateWorkspaceModal = observer(() => {
  const setupStore = useSetupStore();
  const applicationStore = useApplicationStore();
  const {
    loadProjectsState,
    createOrImportProjectState,
    createWorkspaceState,
    showCreateWorkspaceModal,
  } = setupStore;
  const isFetchingProjects = loadProjectsState.isInProgress;
  const projectSelectorRef = useRef<SelectComponent>(null);
  const workspaceNameInputRef = useRef<HTMLInputElement>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | undefined>(
    setupStore.currentProjectId,
  );
  const [workspaceName, setWorkspaceName] = useState('');
  const [isGroupWorkspace, setIsGroupWorkspace] = useState<boolean>(false);
  const workspaceType = isGroupWorkspace
    ? WorkspaceType.GROUP
    : WorkspaceType.USER;
  const projectOptions = setupStore.projectOptions.sort(compareLabelFn);
  const selectedOption =
    projectOptions.find((option) => option.value === currentProjectId) ?? null;
  const dispatchingActions =
    createWorkspaceState.isInProgress ||
    createOrImportProjectState.isInProgress;
  const onSelectionChange = (val: ProjectOption | null): void => {
    if (
      (val !== null || selectedOption !== null) &&
      (!val || !selectedOption || val.value !== selectedOption.value)
    ) {
      setCurrentProjectId(val?.value);
      workspaceNameInputRef.current?.focus();
    }
  };
  const projectSelectorPlaceholder = isFetchingProjects
    ? 'Loading projects'
    : loadProjectsState.hasFailed
    ? 'Error fetching projects'
    : projectOptions.length
    ? 'Choose an existing project'
    : 'You have no projects, please create or acquire access for at least one';

  const closeModal = (): void => {
    setupStore.setShowCreateWorkspaceModal(false);
  };
  const createWorkspace = (): void => {
    if (currentProjectId && workspaceName) {
      flowResult(
        setupStore.createWorkspace(
          currentProjectId,
          workspaceName,
          workspaceType,
        ),
      ).catch(applicationStore.alertUnhandledError);
    }
  };
  const changeWorkspaceName: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => setWorkspaceName(event.target.value);
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    createWorkspace();
  };
  const handleEnter = (): void => {
    if (currentProjectId) {
      workspaceNameInputRef.current?.focus();
    } else {
      projectSelectorRef.current?.focus();
    }
  };
  const toggleGroupWorkspace = (
    event: React.FormEvent<HTMLButtonElement>,
  ): void => {
    event.preventDefault();
    setIsGroupWorkspace(!isGroupWorkspace);
  };

  return (
    <Dialog
      open={showCreateWorkspaceModal}
      onClose={closeModal}
      TransitionProps={{
        onEnter: handleEnter,
      }}
      classes={{ container: 'search-modal__container' }}
      PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
    >
      <div className="modal modal--dark setup__create-workspace-modal">
        <div className="modal__title">
          Create Workspace
          <DocumentationLink
            className="setup__create-workspace-modal__doc__create-workspace"
            documentationKey={LEGEND_STUDIO_DOCUMENTATION_KEY.CREATE_WORKSPACE}
          />
        </div>
        <form onSubmit={handleSubmit}>
          <PanelLoadingIndicator
            isLoading={setupStore.createWorkspaceState.isInProgress}
          />
          <div className="panel__content__form setup__create-workspace-modal__form setup__create-workspace-modal__form__workspace">
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Project Name
              </div>
              <CustomSelectorInput
                className="setup-selector__input setup__workspace__selector"
                ref={projectSelectorRef}
                options={projectOptions}
                disabled={
                  dispatchingActions ||
                  isFetchingProjects ||
                  !projectOptions.length
                }
                isLoading={isFetchingProjects}
                onChange={onSelectionChange}
                value={selectedOption}
                placeholder={projectSelectorPlaceholder}
                isClearable={true}
                escapeClearsValue={true}
                darkMode={true}
              />
            </div>
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Workspace Name
              </div>
              <input
                className="setup__create-workspace-modal__form__workspace-name__input"
                ref={workspaceNameInputRef}
                spellCheck={false}
                disabled={dispatchingActions}
                placeholder="MyWorkspace"
                value={workspaceName}
                onChange={changeWorkspaceName}
              />
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
                  Group workspaces can be edited by all users in the
                  corresponding project.
                </div>
              </div>
            </div>
          </div>
          <div className="panel__content__form__actions">
            <button
              disabled={
                dispatchingActions || !workspaceName || !currentProjectId
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
});

const SetupSelection = observer(() => {
  const setupStore = useSetupStore();
  const applicationStore = useApplicationStore<LegendStudioConfig>();
  const projectSelectorRef = useRef<SelectComponent>(null);
  const workspaceSelectorRef = useRef<SelectComponent>(null);
  const proceedButtonRef = useRef<HTMLButtonElement>(null);
  const documentation = applicationStore.documentationService.getDocEntry(
    LEGEND_STUDIO_DOCUMENTATION_KEY.SETUP_WORKSPACE,
  );
  const isCreatingWorkspace = setupStore.createWorkspaceState.isInProgress;
  const isCreatingOrImportingProject =
    setupStore.createOrImportProjectState.isInProgress;
  const disableProceedButton =
    !setupStore.currentProjectId ||
    !setupStore.currentWorkspaceCompositeId ||
    isCreatingWorkspace ||
    isCreatingOrImportingProject;
  const onProjectChange = (focusNext: boolean): void =>
    focusNext
      ? workspaceSelectorRef.current?.focus()
      : projectSelectorRef.current?.focus();
  const onWorkspaceChange = (focusNext: boolean): void =>
    focusNext
      ? proceedButtonRef.current?.focus()
      : workspaceSelectorRef.current?.focus();
  const handleCreateProjectModal = (): void =>
    setupStore.setShowCreateProjectModal(true);
  const handleCreateWorkspaceModal = (): void =>
    setupStore.setShowCreateWorkspaceModal(true);
  const handleProceed = (): void => {
    if (
      setupStore.currentProjectId &&
      setupStore.currentProject &&
      setupStore.currentWorkspaceCompositeId &&
      setupStore.currentWorkspace
    ) {
      applicationStore.navigator.goTo(
        generateEditorRoute(
          setupStore.currentProjectId,
          setupStore.currentWorkspace.workspaceId,
          setupStore.currentWorkspace.workspaceType,
        ),
      );
    }
  };

  useEffect(() => {
    if (!disableProceedButton) {
      proceedButtonRef.current?.focus();
    }
  }, [disableProceedButton]);

  return (
    <div className="app__page">
      <div className="setup">
        <div className="setup__body">
          <div className="activity-bar">
            {/*
              TODO: consider what we can put here and componentize it
              Currently, we reuse the one from editor which might
              no longer be right in the future
            */}
            <ActivityBarMenu />
          </div>
          <div
            className="setup__content"
            data-testid={LEGEND_STUDIO_TEST_ID.SETUP__CONTENT}
          >
            <div className="setup__content__main">
              <div className="setup__title">
                <div className="setup__title__header">
                  Setup Workspace
                  <DocumentationLink
                    className="setup__doc__setup-workspace"
                    documentationKey={
                      LEGEND_STUDIO_DOCUMENTATION_KEY.SETUP_WORKSPACE
                    }
                  />
                </div>
                {documentation?.markdownText && (
                  <div className="setup__title__documentation">
                    <MarkdownTextViewer value={documentation.markdownText} />
                  </div>
                )}
              </div>
              <div>
                <ProjectSelector
                  ref={projectSelectorRef}
                  onChange={onProjectChange}
                  create={handleCreateProjectModal}
                />
                <WorkspaceSelector
                  ref={workspaceSelectorRef}
                  onChange={onWorkspaceChange}
                  create={handleCreateWorkspaceModal}
                />
                <div className="setup__actions">
                  <button
                    ref={proceedButtonRef}
                    className="setup__next-btn btn--dark"
                    onClick={handleProceed}
                    disabled={disableProceedButton}
                  >
                    Edit Workspace
                  </button>
                </div>
              </div>
              {/* We do this to reset the initial state of the modals */}
              {setupStore.showCreateProjectModal && <CreateProjectModal />}
              {setupStore.showCreateWorkspaceModal && <CreateWorkspaceModal />}
            </div>
          </div>
        </div>
        {/* TODO: consider what we can put here and componentize it */}
        <div className="setup__status-bar" />
      </div>
    </div>
  );
});

export const SetupInner = observer(() => {
  const params = useParams<SetupPathParams>();
  const setupStore = useSetupStore();
  const applicationStore = useApplicationStore();
  useEffect(() => {
    setupStore.setCurrentProjectId(params.projectId);
    setupStore.init(params.workspaceId, params.groupWorkspaceId);
  }, [setupStore, params]);

  useEffect(() => {
    flowResult(setupStore.fetchProjects()).catch(
      applicationStore.alertUnhandledError,
    );
    if (setupStore.currentProjectId) {
      flowResult(setupStore.fetchWorkspaces(setupStore.currentProjectId)).catch(
        applicationStore.alertUnhandledError,
      );
    }
  }, [applicationStore, setupStore]);

  return <SetupSelection />;
});

export const Setup: React.FC = () => (
  <SetupStoreProvider>
    <SetupInner />
  </SetupStoreProvider>
);
